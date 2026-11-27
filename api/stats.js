import { getPublicStats, statsConfigured } from '../server/lib/statsStore.js';
import { json } from '../server/lib/httpJson.js';
import { handleStatsRecord } from '../server/handlers/statsRecord.js';

function isRecordRoute(req) {
  if (req.query?.record === '1' || req.query?._record === '1') return true;
  const raw = String(req.url || '');
  return raw.includes('/stats/record');
}

/** GET /api/stats · POST /api/stats/record (rewrite in vercel.json) — one function. */
export default async function handler(req, res) {
  if (isRecordRoute(req)) {
    await handleStatsRecord(req, res);
    return;
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    json(res, 405, { error: 'Use GET.' });
    return;
  }
  if (!statsConfigured()) {
    json(res, 200, { enabled: false, visits: 0, pairings: 0, scannerDownloads: 0 });
    return;
  }
  const counts = await getPublicStats();
  json(res, 200, { enabled: true, ...counts });
}