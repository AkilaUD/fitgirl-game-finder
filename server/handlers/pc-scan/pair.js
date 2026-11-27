import { PC_SCAN_NOT_CONFIGURED, PC_SCAN_NOT_CONFIGURED_OPS } from '../../lib/pcScanConfigError.js';
import { createPairingSession, pairingConfigured } from '../../lib/pcScanStore.js';
import { clientIp, json, originAllowed, rateLimited } from '../../lib/httpJson.js';
import { sendScannerZip } from '../../lib/scannerZip.js';
import { recordPairingCreated, recordScannerServed } from '../../lib/statsStore.js';

export default async function handler(req, res) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (req.method === 'GET') void recordScannerServed();
    sendScannerZip(req, res);
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, HEAD, POST');
    json(res, 405, { error: 'Use GET (scanner download) or POST (pairing).' });
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
    json(res, 429, { error: 'Too many pairing requests — try again later.' });
    return;
  }

  const result = await createPairingSession();
  if (result.error) {
    json(res, 503, { error: result.error });
    return;
  }
  void recordPairingCreated();
  json(res, 200, {
    sessionId: result.sessionId,
    pairingCode: result.pairingCode,
    expiresAt: result.expiresAt,
    ttlSec: result.ttlSec,
  });
}