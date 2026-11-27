import { pairingConfigured, pairingStorageDebug } from '../lib/pcScanStore.js';
import { json } from '../lib/httpJson.js';

/** Safe diagnostics for pairing storage (no secrets). */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    json(res, 405, { error: 'Use GET.' });
    return;
  }
  const debug = pairingStorageDebug();
  json(res, 200, {
    ok: pairingConfigured(),
    ...debug,
    ...(debug.storageEnvKeys.length === 0
      ? { hint: 'No UPSTASH_* or KV_* vars on this function — link Redis to this Vercel project and redeploy. See docs/UPSTASH_VERCEL.md.' }
      : {}),
  });
}