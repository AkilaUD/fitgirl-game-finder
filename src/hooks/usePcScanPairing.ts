import { useCallback, useEffect, useRef, useState } from 'react';
import type { HardwareReport } from '../lib/hardwareReport';

const SESSION_KEY = 'rf.pcscan.sessionId';

export type PairingPhase =
  | 'idle'
  | 'browserDone'
  | 'pairing'
  | 'waitingDesktop'
  | 'consuming'
  | 'complete'
  | 'error';

export interface PairingSession {
  sessionId: string;
  pairingCode: string;
  expiresAt: string;
}

export function usePcScanPairing(onReport: (report: HardwareReport) => void) {
  const [phase, setPhase] = useState<PairingPhase>('idle');
  const [session, setSession] = useState<PairingSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const consume = useCallback(
    async (sessionId: string) => {
      setPhase('consuming');
      try {
        const r = await fetch('/api/pc-scan/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((body as { error?: string }).error || `HTTP ${r.status}`);
        const report = (body as { report: HardwareReport }).report;
        onReport(report);
        sessionStorage.removeItem(SESSION_KEY);
        setPhase('complete');
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not retrieve the scan.');
        setPhase('error');
      }
    },
    [onReport],
  );

  const startPairing = useCallback(async () => {
    setError(null);
    setPhase('pairing');
    try {
      const r = await fetch('/api/pc-scan/pair', { method: 'POST' });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((body as { error?: string }).error || `HTTP ${r.status}`);
      const next: PairingSession = {
        sessionId: body.sessionId,
        pairingCode: body.pairingCode,
        expiresAt: body.expiresAt,
      };
      setSession(next);
      sessionStorage.setItem(SESSION_KEY, next.sessionId);
      setPhase('waitingDesktop');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pairing failed.');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    if (phase !== 'waitingDesktop' || !session?.sessionId) return;

    const poll = async () => {
      try {
        const r = await fetch(
          `/api/pc-scan/status?sessionId=${encodeURIComponent(session.sessionId)}`,
          { cache: 'no-store' },
        );
        const body = await r.json().catch(() => ({}));
        if (!r.ok) return;
        if (body.status === 'complete') {
          stopPoll();
          await consume(session.sessionId);
        } else if (body.status === 'expired') {
          stopPoll();
          setError('Pairing code expired. Start a new pairing.');
          setPhase('error');
        }
      } catch {
        /* retry on next tick */
      }
    };

    poll();
    pollRef.current = window.setInterval(poll, 2000);
    return stopPoll;
  }, [phase, session, consume, stopPoll]);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved && phase === 'idle') {
      setSession({ sessionId: saved, pairingCode: '', expiresAt: '' });
      setPhase('waitingDesktop');
    }
  }, [phase]);

  const reset = useCallback(() => {
    stopPoll();
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setError(null);
    setPhase('idle');
  }, [stopPoll]);

  const markBrowserDone = useCallback(() => setPhase('browserDone'), []);

  return {
    phase,
    session,
    error,
    startPairing,
    reset,
    markBrowserDone,
    setPhase,
  };
}