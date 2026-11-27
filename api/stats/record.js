import { recordScannerBeacon, recordVisit, statsConfigured } from '../lib/statsStore.js';
import { clientIp, json, originAllowed, readJson } from '../lib/httpJson.js';

const recent = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX = 30;

function rateLimited(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX) return true;
  hits.push(now);
  recent.set(ip, hits);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    json(res, 405, { error: 'Use POST.' });
    return;
  }
  if (!originAllowed(req)) {
    json(res, 403, { error: 'Origin not allowed.' });
    return;
  }
  if (!statsConfigured()) {
    json(res, 200, { ok: false });
    return;
  }
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    json(res, 429, { error: 'Too many requests.' });
    return;
  }

  try {
    const body = await readJson(req, 4096);
    const event = String(body.event || '').trim();
    const sid = String(body.sid || '').trim();

    if (event === 'visit') {
      await recordVisit(sid);
      json(res, 200, { ok: true });
      return;
    }
    if (event === 'scanner') {
      await recordScannerBeacon(sid);
      json(res, 200, { ok: true });
      return;
    }
    json(res, 400, { error: 'Unknown event.' });
  } catch {
    json(res, 400, { error: 'Invalid request.' });
  }
}