const SID_KEY = 'rf.stats.sid';
const VISIT_KEY = 'rf.stats.visitSent';

export interface PublicSiteStats {
  enabled: boolean;
  visits: number;
  pairings: number;
  scannerDownloads: number;
}

function sessionId(): string {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return `s${Date.now().toString(36)}`;
  }
}

export function formatStatCount(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export async function fetchPublicStats(): Promise<PublicSiteStats | null> {
  try {
    const r = await fetch('/api/stats', { cache: 'no-store' });
    if (!r.ok) return null;
    const body = (await r.json()) as PublicSiteStats;
    if (!body.enabled) return null;
    return body;
  } catch {
    return null;
  }
}

/** Once per tab session — increments public visit counter when Redis is configured. */
export function recordSiteVisit(): void {
  try {
    if (sessionStorage.getItem(VISIT_KEY)) return;
    sessionStorage.setItem(VISIT_KEY, '1');
  } catch {
    return;
  }
  const sid = sessionId();
  void fetch('/api/stats/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'visit', sid }),
    keepalive: true,
  }).catch(() => {});
}

/** When the user saves the static installer from /downloads (API route counted server-side). */
export function recordScannerDownloadClick(): void {
  const sid = sessionId();
  void fetch('/api/stats/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'scanner', sid }),
    keepalive: true,
  }).catch(() => {});
}