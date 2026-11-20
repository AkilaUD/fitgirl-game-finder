import { createPairingSession, pairingConfigured } from '../lib/pcScanStore.js';
import { clientIp, json, originAllowed, rateLimited } from '../lib/httpJson.js';

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
    json(res, 503, { error: 'PC scan pairing is not configured on this deployment.' });
    return;
  }
  const ip = clientIp(req);
  if (rateLimited(ip, 'pair')) {
    json(res, 429, { error: 'Too many pairing requests — try again later.' });
    return;
  }

  const result = await createPairingSession();
  if (result.error) {
    json(res, 503, { error: result.error });
    return;
  }
  json(res, 200, {
    sessionId: result.sessionId,
    pairingCode: result.pairingCode,
    expiresAt: result.expiresAt,
    ttlSec: result.ttlSec,
  });
}