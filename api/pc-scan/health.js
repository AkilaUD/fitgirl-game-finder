import { pairingConfigured, pairingStorageDebug } from '../lib/pcScanStore.js';
import { json } from '../lib/httpJson.js';

/** Safe diagnostics for pairing storage (no secrets). */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    json(res, 405, { error: 'Use GET.' });
    return;
  }
  json(res, 200, {
    ok: pairingConfigured(),
    ...pairingStorageDebug(),
  });
}