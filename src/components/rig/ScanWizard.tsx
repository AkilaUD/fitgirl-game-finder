import type { DetectedInfo } from '../../lib/gameTypes';
import type { HardwareReportVolume } from '../../lib/hardwareReport';
import type { PairingPhase, PairingSession } from '../../hooks/usePcScanPairing';
import { resolveScannerDownload, SCANNER_DOWNLOAD_FILENAME } from '../../lib/scannerDownload';
import { recordScannerDownloadClick } from '../../lib/siteStats';

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
          <h4>Step 1 — Quick check</h4>
          <p className="muted scan-step-lede">
            We read what your browser can see right away. For exact CPU and disk space, use the Windows scanner in step
            2 or type your specs on the main page.
          </p>
          <ul className="scan-facts">
            <li>Graphics: {browserDetected?.gpus?.[0] || '—'}</li>
            <li>Processor: {browserDetected?.cpu || '—'}</li>
            <li>
              Memory:{' '}
              {browserDetected?.ram != null
                ? `${browserDetected.ram}${browserDetected.ramCapped ? '+' : ''} GB`
                : '—'}
            </li>
          </ul>
        </section>

        <section className="scan-step">
          <h4>Step 2 — Full hardware (Windows)</h4>
          <p className="muted scan-step-lede">
            Download and run <strong>FitGirl PC Scanner</strong>, enter the pairing code below, and confirm upload.
          </p>
          <a
            className="btn primary"
            href={scannerDownload.href}
            download={scannerDownload.directDownload ? SCANNER_DOWNLOAD_FILENAME : undefined}
            onClick={() => recordScannerDownloadClick()}
            {...(scannerDownload.directDownload
              ? {}
              : { target: '_blank', rel: 'noopener noreferrer' })}
          >
            Download FitGirl PC Scanner (.exe)
          </a>
          <p className="muted scan-smartscreen-note">
            If Windows SmartScreen appears, choose <strong>More info</strong> → <strong>Run anyway</strong>. The scanner
            only reads hardware and sends data when you confirm — it does not install anything.
          </p>
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