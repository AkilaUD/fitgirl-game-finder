import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

type Phase = 'idle' | 'scanning' | 'review' | 'uploading' | 'done' | 'error';

export default function App() {
  const [code, setCode] = useState('');
  const defaultApiBase =
    typeof window !== 'undefined' ? window.location.origin : 'https://fitgirl-game-finder.vercel.app';
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [phase, setPhase] = useState<Phase>('idle');
  const [reportJson, setReportJson] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const runScan = async () => {
    setPhase('scanning');
    setMessage(null);
    try {
      const json = await invoke<string>('collect_hardware');
      setReportJson(json);
      setPhase('review');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const upload = async () => {
    if (!reportJson || !/^[A-Z0-9]{6}$/.test(code.trim().toUpperCase())) {
      setMessage('Enter a 6-character pairing code from the website.');
      return;
    }
    setPhase('uploading');
    setMessage(null);
    try {
      await invoke('upload_report', {
        apiBase: apiBase.replace(/\/$/, ''),
        pairingCode: code.trim().toUpperCase(),
        reportJson,
      });
      setPhase('done');
      setMessage('Report sent. Return to the website to finish.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const preview = reportJson ? JSON.parse(reportJson) : null;

  return (
    <main className="app">
      <h1>FitGirl PC Scanner</h1>
      <p className="lede">Pair with Repack Finder, scan this PC, then confirm upload. No data leaves your machine until you send.</p>

      <label>
        Website API base
        <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} spellCheck={false} />
      </label>

      <label>
        Pairing code (from website)
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" />
      </label>

      <div className="actions">
        <button type="button" onClick={runScan} disabled={phase === 'scanning' || phase === 'uploading'}>
          {phase === 'scanning' ? 'Scanning…' : 'Scan hardware'}
        </button>
        <button type="button" onClick={upload} disabled={phase !== 'review' && phase !== 'error'}>
          Send report to website
        </button>
      </div>

      {message ? <p className="msg">{message}</p> : null}

      {preview ? (
        <section className="summary">
          <h2>Detected</h2>
          <ul>
            <li>CPU: {preview.cpu?.model ?? '—'}</li>
            <li>RAM: {preview.ram?.totalGB ?? '—'} GB</li>
            <li>GPU: {preview.gpus?.[0]?.model ?? '—'}</li>
            <li>Volumes: {(preview.volumes || []).map((v: { driveLetter: string }) => v.driveLetter).join(', ') || '—'}</li>
            <li>OS: {preview.os?.name ?? '—'}</li>
          </ul>
        </section>
      ) : null}
    </main>
  );
}