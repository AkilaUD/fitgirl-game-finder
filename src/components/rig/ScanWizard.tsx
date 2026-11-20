import type { DetectedInfo } from '../../lib/gameTypes';
import type { HardwareReportVolume } from '../../lib/hardwareReport';
import type { PairingPhase, PairingSession } from '../../hooks/usePcScanPairing';
import { resolveScannerDownload, SCANNER_DOWNLOAD_FILENAME } from '../../lib/scannerDownload';

const scannerDownload = resolveScannerDownload();

interface ScanWizardProps {
  open: boolean;
  phase: PairingPhase;
  session: PairingSession | null;
  error: string | null;
  browserDetected: DetectedInfo | null;
  volumes: HardwareReportVolume[];
  installMount: string | null;
  onInstallMount: (mount: string) => void;
  onClose: () => void;
  onStartPairing: () => void;
  onReset: () => void;
}

function sourceTag(kind: string, prov?: string) {
  if (prov === 'desktop') return `${kind} · desktop detected`;
  if (prov === 'browser') return `${kind} · browser estimate`;
  if (prov === 'manual') return `${kind} · manual`;
  return `${kind} · unavailable`;
}

export function ScanWizard({
  open,
  phase,
  session,
  error,
  browserDetected,
  volumes,
  installMount,
  onInstallMount,
  onClose,
  onStartPairing,
  onReset,
}: ScanWizardProps) {
  if (!open) return null;

  const p = browserDetected?.provenance;

  return (
    <div className="scan-wizard" role="dialog" aria-modal="true" aria-labelledby="scanWizardTitle">
      <div className="scan-wizard-card hud-corners">
        <button type="button" className="modal-close" aria-label="Close scan wizard" onClick={onClose}>
          ✕
        </button>
        <h3 id="scanWizardTitle" className="scan-wizard-title">
          Scan your PC
        </h3>

        <section className="scan-step">
          <h4>Step 1 — Browser scan</h4>
          <p className="muted scan-step-lede">
            Immediate results from your browser. CPU model and physical disk space require the Windows scanner or
            manual entry.
          </p>
          <ul className="scan-facts">
            <li>{sourceTag('GPU', p?.gpu)}: {browserDetected?.gpus?.[0] || '—'}</li>
            <li>{sourceTag('CPU', p?.cpu)}: {browserDetected?.cpu || '—'}</li>
            <li>
              {sourceTag('RAM', p?.ram)}:{' '}
              {browserDetected?.ram != null
                ? `${browserDetected.ram}${browserDetected.ramCapped ? '+' : ''} GB`
                : '—'}
            </li>
            <li>
              Browser quota (not disk): {browserDetected?.quotaEstimateGb != null ? `${browserDetected.quotaEstimateGb} GB` : '—'}
            </li>
            {browserDetected?.browserName ? (
              <li>
                Browser: {browserDetected.browserName} {browserDetected.browserVersion || ''}
              </li>
            ) : null}
          </ul>
        </section>

        <section className="scan-step">
          <h4>Step 2 — Full hardware (Windows)</h4>
          <p className="muted scan-step-lede">
            Download the portable scanner (zip), extract it, run <strong>Run-Scanner.cmd</strong>, enter the pairing
            code below, and confirm upload.
          </p>
          <a
            className="btn primary"
            href={scannerDownload.href}
            download={scannerDownload.directDownload ? SCANNER_DOWNLOAD_FILENAME : undefined}
            {...(scannerDownload.directDownload
              ? {}
              : { target: '_blank', rel: 'noopener noreferrer' })}
          >
            Download portable scanner (.zip)
          </a>
          {scannerDownload.bundled ? (
            <p className="muted">
              No install needed — extract the zip and run Run-Scanner.cmd. A full .exe installer is optional after{' '}
              <code>npm run scanner:build</code>.
            </p>
          ) : null}
        </section>

        <section className="scan-step">
          <h4>Step 3 — Pair with this tab</h4>
          {phase === 'waitingDesktop' && session?.pairingCode ? (
            <div className="pairing-code-block">
              <span className="pairing-code" aria-live="polite">
                {session.pairingCode}
              </span>
              <button
                type="button"
                className="btn ghost"
                onClick={() => navigator.clipboard?.writeText(session.pairingCode)}
              >
                Copy code
              </button>
              <p className="muted">Waiting for the desktop scanner…</p>
            </div>
          ) : phase === 'pairing' || phase === 'consuming' ? (
            <p className="muted">{phase === 'pairing' ? 'Creating pairing session…' : 'Applying hardware report…'}</p>
          ) : phase === 'complete' ? (
            <p className="dxdiag-status ok">Scan complete — your profile was updated.</p>
          ) : (
            <button type="button" className="btn primary" onClick={onStartPairing}>
              Generate pairing code
            </button>
          )}
          {error ? <p className="dxdiag-status err">{error}</p> : null}
        </section>

        {volumes.length > 1 ? (
          <section className="scan-step">
            <h4>Install drive (for storage checks)</h4>
            <label className="field">
              <span>Volume</span>
              <select
                value={installMount || ''}
                onChange={(e) => onInstallMount(e.target.value)}
              >
                {volumes.map((v) => (
                  <option key={v.driveLetter || '?'} value={v.driveLetter || ''}>
                    {v.driveLetter} {v.label ? `(${v.label})` : ''}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : null}

        <div className="scan-wizard-actions">
          <button type="button" className="btn ghost" onClick={onReset}>
            Reset pairing
          </button>
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}