import { getSessionStatus, pairingConfigured } from '../lib/pcScanStore.js';
import { json, originAllowed } from '../lib/httpJson.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    json(res, 405, { error: 'Use GET.' });
    return;
  }
  if (!originAllowed(req)) {
    json(res, 403, { error: 'Origin not allowed.' });
    return;
  }
  if (!pairingConfigured()) {
    json(res, 503, { error: 'PC scan pairing is not configured.' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('sessionId')?.trim();
  if (!sessionId) {
    json(res, 400, { error: 'sessionId query parameter is required.' });
    return;
  }

  const result = await getSessionStatus(sessionId);
  if (result.error) {
    json(res, 503, { error: result.error });
    return;
  }
  json(res, 200, { status: result.status, expiresAt: result.expiresAt ?? null });
}