import { PC_SCAN_NOT_CONFIGURED, PC_SCAN_NOT_CONFIGURED_OPS } from '../lib/pcScanConfigError.js';
import { consumeSession, pairingConfigured } from '../lib/pcScanStore.js';
import { clientIp, json, originAllowed, readJson, rateLimited } from '../lib/httpJson.js';

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
  if (!pairingConfigured()) {
    console.warn(PC_SCAN_NOT_CONFIGURED_OPS);
    json(res, 503, PC_SCAN_NOT_CONFIGURED);
    return;
  }
  const ip = clientIp(req);
  if (rateLimited(ip, 'pair')) {
    json(res, 429, { error: 'Too many requests.' });
    return;
  }

  let body;
  try {
    body = await readJson(req, 4096);
  } catch {
    json(res, 400, { error: 'Invalid request body.' });
    return;
  }

  const sessionId = String(body.sessionId || '').trim();
  if (!sessionId) {
    json(res, 400, { error: 'sessionId is required.' });
    return;
  }

  const result = await consumeSession(sessionId);
  if (result.error) {
    json(res, 400, { error: result.error });
    return;
  }
  json(res, 200, { ok: true, report: result.report });
}