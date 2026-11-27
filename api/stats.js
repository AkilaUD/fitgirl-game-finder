import { getPublicStats, statsConfigured } from './lib/statsStore.js';
import { json } from './lib/httpJson.js';

/** Public usage counters (requires Upstash Redis — same as pairing). */
export default async function handler(req, res) {
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