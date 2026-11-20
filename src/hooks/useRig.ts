import { useCallback, useMemo, useState } from 'react';
import { gpuScore, cpuScore, parseDxdiag } from '../lib/specs';
import { readSystemInfo, helperExpected } from '../lib/helperExpected';
import { runBrowserScan } from '../lib/browserScan';
import { mapReportToRig } from '../lib/mapReportToRig';
import type { HardwareReport } from '../lib/hardwareReport';
import type { HardwareReportVolume } from '../lib/hardwareReport';
import {
  clearRigProfile,
  defaultRigState,
  loadRigProfile,
  saveRigProfile,
} from '../lib/rigStorage';
import type { DetectedInfo, PcProfile, RigState } from '../lib/gameTypes';

export function useRig() {
  const [initial] = useState(loadRigProfile);
  const [rig, setRig] = useState<RigState>(initial.rig);
  const [detected, setDetected] = useState<DetectedInfo | null>(initial.detected);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [lastBrowserScan, setLastBrowserScan] = useState<DetectedInfo | null>(null);
  const [desktopVolumes, setDesktopVolumes] = useState<HardwareReportVolume[]>([]);

  const persist = useCallback((nextRig: RigState, nextDetected: DetectedInfo | null) => {
    saveRigProfile(nextRig, nextDetected);
  }, []);

  const updateRig = useCallback(
    (patch: Partial<RigState>) => {
      setRig((prev) => {
        const next = { ...prev, ...patch };
        const det = detected ? {
          ...detected,
          provenance: {
            ...detected.provenance,
            ...(patch.gpu !== undefined ? { gpu: 'manual' as const } : {}),
            ...(patch.cpu !== undefined ? { cpu: 'manual' as const } : {}),
            ...(patch.ram !== undefined ? { ram: 'manual' as const } : {}),
            ...(patch.freeGb !== undefined ? { freeGb: 'manual' as const } : {}),
            ...(patch.installMount !== undefined ? { installMount: 'manual' as const } : {}),
          },
        } : detected;
        persist(next, det);
        if (det) setDetected(det);
        return next;
      });
    },
    [detected, persist],
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
    setRig(defaultRigState());
    setDetected(null);
    setLastBrowserScan(null);
    setDesktopVolumes([]);
    clearRigProfile();
  }, []);

  const mergeLocalServer = useCallback(
    async (browser: DetectedInfo, nextRig: RigState, nextDetected: DetectedInfo) => {
      const local = await readSystemInfo();
      if (!local) return { rig: nextRig, detected: nextDetected };

      const merged: DetectedInfo = { ...browser, ...local, source: 'local-server' };
      let rigOut = { ...nextRig };

      if (local.cpu) {
        rigOut.cpu = String(local.cpu)
          .replace(/\s+/g, ' ')
          .replace(/\s*\(R\)|\s*\(TM\)/gi, '')
          .replace(/\s*CPU\s*@.*$/i, '')
          .trim();
        merged.provenance = { ...merged.provenance, cpu: 'desktop' };
      }
      if (local.ramGb) {
        rigOut.ram = Math.round(local.ramGb);
        merged.provenance = { ...merged.provenance, ram: 'desktop' };
      }
      const gpus = (local.gpus || [])
        .filter((g: string) => !/virtual|basic display|remote|mirror/i.test(g))
        .sort((a: string, b: string) => (gpuScore(b) || 0) - (gpuScore(a) || 0));
      if (gpus[0]) {
        rigOut.gpu = String(gpus[0])
          .replace(/\s*\((r|tm)\)/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        merged.provenance = { ...merged.provenance, gpu: 'desktop' };
      } else if (browser.gpus?.[0]) rigOut.gpu = browser.gpus[0];

      if (local.drives?.length) {
        rigOut.freeGb = Math.round(local.freeGb);
        merged.drives = local.drives;
        merged.provenance = { ...merged.provenance, freeGb: 'desktop' };
      }

      return { rig: rigOut, detected: merged };
    },
    [],
  );

  const runScan = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    try {
      const browser = await runBrowserScan();
      setLastBrowserScan(browser);

      let nextRig: RigState = { ...rig };
      let nextDetected: DetectedInfo = browser;

      if (browser.gpus?.[0] && !nextRig.gpu) nextRig.gpu = browser.gpus[0];
      if (browser.ram && !browser.ramCapped && nextRig.ram == null) nextRig.ram = browser.ram;

      if (helperExpected()) {
        const merged = await mergeLocalServer(browser, nextRig, nextDetected);
        nextRig = merged.rig;
        nextDetected = merged.detected;
      }

      setDetected(nextDetected);
      setRig(nextRig);
      persist(nextRig, nextDetected);
      setWizardOpen(true);
    } catch {
      setScanError('The scan was blocked by your browser. Type your specs in manually.');
    } finally {
      setScanning(false);
    }
  }, [rig, persist, mergeLocalServer]);

  const applyHardwareReport = useCallback(
    (report: HardwareReport, installMount?: string | null) => {
      const mount = installMount ?? rig.installMount;
      const { rig: mapped, detected: det, volumes } = mapReportToRig(report, {
        installMount: mount,
        scanSource: 'desktop',
      });
      setDesktopVolumes(volumes);
      setRig(mapped);
      setDetected(det);
      persist(mapped, det);
      setWizardOpen(false);
    },
    [rig.installMount, persist],
  );

  const setInstallMount = useCallback(
    (mount: string) => {
      updateRig({ installMount: mount });
      const vol = desktopVolumes.find((v) => v.driveLetter === mount);
      if (vol?.freeBytes != null) {
        const freeGb = Math.round((vol.freeBytes / 1e9) * 10) / 10;
        updateRig({ installMount: mount, freeGb: Math.round(freeGb) });
      }
    },
    [desktopVolumes, updateRig],
  );

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
        provenance: {
          ...detected?.provenance,
          cpu: parsed.cpu ? 'desktop' : detected?.provenance?.cpu,
          ram: parsed.ramGb != null ? 'desktop' : detected?.provenance?.ram,
          freeGb: parsed.freeGb != null ? 'desktop' : detected?.provenance?.freeGb,
          gpu: parsed.gpus.length ? 'desktop' : detected?.provenance?.gpu,
        },
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
      persist(nextRig, nextDetected);

      const bits: string[] = [];
      if (parsed.cpu) bits.push(parsed.cpu);
      if (parsed.ramGb != null) bits.push(`${parsed.ramGb} GB RAM`);
      if (parsed.drives.length) {
        bits.push(parsed.drives.map((d) => `${d.mount} ${Math.round(d.freeGb)} GB free`).join(' · '));
      }
      if (gpus[0]) bits.push(nextRig.gpu);
      return { ok: true, message: `Added ${bits.join(' · ')}.` };
    },
    [detected, rig, persist],
  );

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
    applyHardwareReport,
    helperOnPrivateHost: helperExpected(),
    wizardOpen,
    setWizardOpen,
    lastBrowserScan,
    desktopVolumes,
    setInstallMount,
  };
}