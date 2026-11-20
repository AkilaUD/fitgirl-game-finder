import { useCallback, useMemo, useState } from 'react';
import { gpuScore, cpuScore, scanPc, parseDxdiag } from '../lib/specs';
import { readSystemInfo, helperExpected } from '../lib/helperExpected';
import type { DetectedInfo, PcProfile, RigState } from '../lib/gameTypes';

const KEY = 'rf.rig.v2';

function loadSaved(): { rig: RigState; detected: DetectedInfo | null } {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && (saved.gpu || saved.cpu || saved.ram)) {
      return {
        rig: {
          gpu: saved.gpu || '',
          cpu: saved.cpu || '',
          ram: saved.ram ?? null,
          freeGb: saved.freeGb ?? null,
        },
        detected: saved.detected || null,
      };
    }
  } catch {
    /* ignore */
  }
  return { rig: { gpu: '', cpu: '', ram: null, freeGb: null }, detected: null };
}

export function useRig() {
  const [initial] = useState(loadSaved);
  const [rig, setRig] = useState<RigState>(initial.rig);
  const [detected, setDetected] = useState<DetectedInfo | null>(initial.detected);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const save = useCallback((nextRig: RigState, nextDetected: DetectedInfo | null) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...nextRig, detected: nextDetected }));
    } catch {
      /* ignore */
    }
  }, []);

  const updateRig = useCallback(
    (patch: Partial<RigState>) => {
      setRig((prev) => {
        const next = { ...prev, ...patch };
        save(next, detected);
        return next;
      });
    },
    [detected, save],
  );

  const hasRig = Boolean(rig.gpu || rig.cpu || rig.ram);

  const pcProfile = useMemo<PcProfile>(
    () => ({
      gpuScore: gpuScore(rig.gpu),
      cpuScore: cpuScore(rig.cpu),
      ram: rig.ram != null ? Number(rig.ram) : null,
      freeGb: rig.freeGb != null ? Number(rig.freeGb) : null,
    }),
    [rig],
  );

  const gpuTag = rig.gpu
    ? gpuScore(rig.gpu)
      ? `index ${gpuScore(rig.gpu)} · ${(gpuScore(rig.gpu)! >= 70 ? 'high-end' : gpuScore(rig.gpu)! >= 34 ? 'upper mid-range' : gpuScore(rig.gpu)! >= 16 ? 'mid-range' : gpuScore(rig.gpu)! >= 6 ? 'entry-level' : 'very low')}`
      : 'not recognised — try the exact model name'
    : '';

  const cpuTag = rig.cpu
    ? cpuScore(rig.cpu)
      ? `relative score ${cpuScore(rig.cpu)!.toFixed(1)}`
      : 'not recognised — try e.g. "Ryzen 5 5600"'
    : '';

  const clearRig = useCallback(() => {
    const empty = { gpu: '', cpu: '', ram: null, freeGb: null };
    setRig(empty);
    setDetected(null);
    localStorage.removeItem(KEY);
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    try {
      const local = await readSystemInfo();
      const browser = await scanPc();
      const nextDetected: DetectedInfo = { ...browser, ...(local || {}) };
      let nextRig = { ...rig };

      if (local) {
        nextDetected.source = 'local-server';
        if (local.cpu) {
          nextRig.cpu = String(local.cpu)
            .replace(/\s+/g, ' ')
            .replace(/\s*\(R\)|\s*\(TM\)/gi, '')
            .replace(/\s*CPU\s*@.*$/i, '')
            .trim();
        }
        if (local.ramGb) nextRig.ram = Math.round(local.ramGb);
        const gpus = (local.gpus || [])
          .filter((g: string) => !/virtual|basic display|remote|mirror/i.test(g))
          .sort((a: string, b: string) => (gpuScore(b) || 0) - (gpuScore(a) || 0));
        if (gpus[0]) {
          nextRig.gpu = String(gpus[0])
            .replace(/\s*\((r|tm)\)/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        } else if (browser.gpu) nextRig.gpu = browser.gpu;
        if (local.drives?.length) nextRig.freeGb = Math.round(local.freeGb);
        else if (browser.freeGb) nextRig.freeGb = Math.round(browser.freeGb);
      } else {
        nextDetected.source = 'browser';
        if (browser.gpu) nextRig.gpu = browser.gpu;
        if (browser.ram && !browser.ramCapped && !nextRig.ram) nextRig.ram = browser.ram;
      }

      setDetected(nextDetected);
      setRig(nextRig);
      save(nextRig, nextDetected);
    } catch {
      setScanError('The scan was blocked by your browser. Type your specs in manually.');
    } finally {
      setScanning(false);
    }
  }, [rig, save]);

  const applyDxdiag = useCallback(
    (text: string): { ok: boolean; message: string } => {
      const parsed = parseDxdiag(text);
      if (!parsed.cpu && parsed.ramGb == null && !parsed.drives.length && !parsed.gpus.length) {
        return {
          ok: false,
          message:
            'No hardware found in that text — paste the whole DxDiag.txt, starting with "System Information".',
        };
      }

      const nextDetected: DetectedInfo = {
        ...(detected || {}),
        source: 'dxdiag',
        cpu: parsed.cpu || detected?.cpu || null,
        ramGb: parsed.ramGb ?? detected?.ramGb ?? null,
        drives: parsed.drives.length ? parsed.drives : detected?.drives,
        gpus: parsed.gpus.length ? parsed.gpus : detected?.gpus,
      };
      const nextRig = { ...rig };
      if (parsed.cpu) nextRig.cpu = parsed.cpu;
      if (parsed.ramGb != null) nextRig.ram = Math.round(parsed.ramGb);
      if (parsed.freeGb != null) nextRig.freeGb = Math.round(parsed.freeGb);
      const gpus = parsed.gpus
        .filter((g) => !/virtual|basic display|remote|mirror/i.test(g))
        .sort((a, b) => (gpuScore(b) || 0) - (gpuScore(a) || 0));
      if (gpus[0]) {
        nextRig.gpu = String(gpus[0])
          .replace(/\s*\((?:R|TM)\)/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      setDetected(nextDetected);
      setRig(nextRig);
      save(nextRig, nextDetected);

      const bits: string[] = [];
      if (parsed.cpu) bits.push(parsed.cpu);
      if (parsed.ramGb != null) bits.push(`${parsed.ramGb} GB RAM`);
      if (parsed.drives.length) {
        bits.push(parsed.drives.map((d) => `${d.mount} ${Math.round(d.freeGb)} GB free`).join(' · '));
      }
      if (gpus[0]) bits.push(nextRig.gpu);
      return { ok: true, message: `Added ${bits.join(' · ')}.` };
    },
    [detected, rig, save],
  );

  const helperOnPrivateHost = helperExpected();

  return {
    rig,
    detected,
    updateRig,
    hasRig,
    pcProfile,
    gpuTag,
    cpuTag,
    clearRig,
    runScan,
    scanning,
    scanError,
    applyDxdiag,
    helperOnPrivateHost,
  };
}