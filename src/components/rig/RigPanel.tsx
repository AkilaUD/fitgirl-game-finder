import { useId, useMemo, useState } from 'react';
import type { Game } from '../../lib/gameTypes';
import type { useRig } from '../../hooks/useRig';
import { ScanFX } from '../vfx/ScanFX';
import { helperExpected } from '../../lib/helperExpected';
import { evaluate } from '../../lib/specs';

type RigApi = ReturnType<typeof useRig>;

interface RigPanelProps {
  rig: RigApi;
  games: Game[] | null;
  gpuSuggestions: string[];
  cpuSuggestions: string[];
  onScan: () => void;
  flash: boolean;
}

export function RigPanel({ rig, games, gpuSuggestions, cpuSuggestions, onScan, flash }: RigPanelProps) {
  const gpuListId = useId();
  const cpuListId = useId();
  const [dxText, setDxText] = useState('');
  const [dxStatus, setDxStatus] = useState<{ cls: string; text: string }>({ cls: '', text: '' });

  const summary = useMemo(() => {
    if (!rig.hasRig || !games) return null;
    const pc = rig.pcProfile;
    let runnable = 0;
    let great = 0;
    for (const g of games) {
      if (!g.steam) continue;
      const v = evaluate(g, pc).verdict;
      if (v === 'rec') {
        runnable++;
        great++;
      } else if (v === 'min') runnable++;
    }
    const missing: string[] = [];
    if (!rig.rig.gpu) missing.push('graphics card');
    if (rig.rig.freeGb == null) missing.push('free disk space');
    const hint = missing.length ? ` Add your ${missing.join(' and ')} for accurate matching.` : '';
    return {
      matched: games.filter((g) => g.steam).length,
      runnable,
      great,
      hint,
    };
  }, [rig, games]);

  const statusText = !rig.hasRig
    ? 'No profile yet — scan to detect your GPU and hardware, or type it in below.'
    : summary
      ? `Matched against ${summary.matched.toLocaleString()} repacks that have published requirements.${summary.hint}`
      : '';

  const detectedBits = buildDetected(rig);

  const useDxdiag = () => {
    const result = rig.applyDxdiag(dxText);
    setDxStatus({ cls: result.ok ? 'ok' : 'err', text: result.message });
  };

  return (
    <section
      className={`rig hud-corners${rig.scanning ? ' scanning' : ''}${flash ? ' rig-flash' : ''}`}
      id="rig"
    >
      <ScanFX active={rig.scanning} />
      <div className="rig-head">
        <div>
          <h2>Your PC</h2>
          <p className="muted">{rig.scanError || statusText}</p>
        </div>
        <div className="rig-actions">
          <button type="button" className="btn primary" onClick={onScan} disabled={rig.scanning}>
            {rig.scanning ? 'Scanning…' : 'Scan my PC'}
          </button>
          {rig.hasRig ? (
            <button type="button" className="btn ghost" onClick={rig.clearRig}>
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <div className="rig-grid">
        <label className="field">
          <span>Graphics card</span>
          <input
            type="text"
            list={gpuListId}
            placeholder="e.g. RTX 3060, RX 580, Iris Xe"
            autoComplete="off"
            value={rig.rig.gpu}
            onChange={(e) => rig.updateRig({ gpu: e.target.value.trim() })}
          />
          <datalist id={gpuListId}>
            {gpuSuggestions.slice(0, 300).map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <em>{rig.gpuTag}</em>
        </label>
        <label className="field">
          <span>Processor</span>
          <input
            type="text"
            list={cpuListId}
            placeholder="e.g. Ryzen 5 3600, i5-10400"
            autoComplete="off"
            value={rig.rig.cpu}
            onChange={(e) => rig.updateRig({ cpu: e.target.value.trim() })}
          />
          <datalist id={cpuListId}>
            {cpuSuggestions.slice(0, 300).map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <em>{rig.cpuTag}</em>
        </label>
        <label className="field narrow">
          <span>RAM (GB)</span>
          <input
            type="number"
            min={1}
            max={512}
            step={1}
            placeholder="16"
            value={rig.rig.ram ?? ''}
            onChange={(e) =>
              rig.updateRig({ ram: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
        </label>
        <label className="field narrow">
          <span>Free disk (GB)</span>
          <input
            type="number"
            min={0}
            max={20000}
            step={10}
            placeholder="250"
            value={rig.rig.freeGb ?? ''}
            onChange={(e) =>
              rig.updateRig({ freeGb: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
        </label>
      </div>

      <div className="chips rig-chips">
        <span className="chips-label">RAM</span>
        {[8, 16, 32, 64].map((gb) => (
          <button key={gb} type="button" className="chip" onClick={() => rig.updateRig({ ram: gb })}>
            {gb} GB
          </button>
        ))}
      </div>

      <details className="dxdiag">
        <summary>Get exact CPU, RAM and free disk from a DxDiag report</summary>
        <div className="dxdiag-body">
          <p className="dxdiag-help">
            A browser cannot read your CPU model or free disk space on a hosted copy, but Windows can. Press{' '}
            <code>Win</code>+<code>R</code>, type <code>dxdiag</code>, wait for the progress bar to finish, then click{' '}
            <b>Save All Information…</b>. Open the saved <code>DxDiag.txt</code>, copy all of it and paste it here. The
            report is read in this tab and never uploaded.
          </p>
          <textarea
            rows={6}
            spellCheck={false}
            placeholder="Paste the contents of DxDiag.txt here…"
            aria-label="DxDiag report text"
            value={dxText}
            onChange={(e) => setDxText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                useDxdiag();
              }
            }}
          />
          <div className="dxdiag-actions">
            <button type="button" className="btn" onClick={useDxdiag}>
              Use these specs
            </button>
            <span className={`dxdiag-status ${dxStatus.cls}`} role="status" aria-live="polite">
              {dxStatus.text}
            </span>
          </div>
        </div>
      </details>

      <div className="rig-foot">
        <div className="detected muted" dangerouslySetInnerHTML={{ __html: detectedBits }} />
        {summary && rig.hasRig ? (
          <div className="rig-summary">
            <strong>{summary.runnable.toLocaleString()}</strong> repacks should run ·{' '}
            <strong>{summary.great.toLocaleString()}</strong> hit recommended specs
          </div>
        ) : null}
      </div>
      <p className="fineprint">
        The scan always runs here in the browser, so nothing leaves your machine. In a hosted copy it can only read the
        GPU name, thread count and a RAM figure capped at 8 GB — the CPU model and free disk space have to be typed in.
        Run the site locally with <code>node scripts/serve.mjs</code> and the helper reports the real CPU model, total
        RAM and the free space on <b>every drive</b>. Every field stays editable. On a hosted copy, paste a DxDiag report
        into the box above and the CPU model, total RAM, GPU and free space on every drive are filled in exactly, without
        a server.
      </p>
    </section>
  );
}

function buildDetected(rig: RigApi) {
  const d = rig.detected || {};
  const bits: string[] = [];
  if (d.source === 'local-server') bits.push('<span class="tag">read from this PC</span>');
  if (d.cpu) bits.push(`<span>CPU <b>${esc(String(d.cpu).replace(/\s+/g, ' '))}</b></span>`);
  if (d.cores) bits.push(`<span><b>${d.cores}</b> threads</span>`);
  if (d.ramGb) bits.push(`<span>RAM <b>${d.ramGb} GB</b></span>`);
  else if (d.ram) bits.push(`<span>RAM <b>${d.ram}${d.ramCapped ? '+' : ''} GB</b> (browser estimate)</span>`);
  if (d.drives?.length) {
    bits.push(
      `<span>Drives <b>${d.drives.map((x) => `${x.mount} ${Math.round(x.freeGb)} GB free`).join(' · ')}</b></span>`,
    );
  }
  if (d.screen) bits.push(`<span>Display <b>${d.screen}</b>${(d.dpr || 1) > 1 ? ` @${d.dpr}x` : ''}</span>`);
  if (d.platform) bits.push(`<span>Platform <b>${d.platform}</b></span>`);
  if (d.source === 'dxdiag') bits.push('<span class="tag">from your DxDiag</span>');
  if (d.source === 'browser') {
    bits.push(
      helperExpected()
        ? '<span>Browser estimate — the local helper is not running. Start it with <code>node scripts/serve.mjs</code> for the exact CPU model, total RAM and free disk space.</span>'
        : '<span>Browser estimate — a hosted page cannot read your CPU model or free disk space. Paste a DxDiag report below, or type the values in, for an exact match.</span>',
    );
  }
  return bits.join('');
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}