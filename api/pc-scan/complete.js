import { PC_SCAN_NOT_CONFIGURED, PC_SCAN_NOT_CONFIGURED_OPS } from '../lib/pcScanConfigError.js';
import { completePairing, pairingConfigured } from '../lib/pcScanStore.js';
import { validateHardwareReport } from '../lib/hardwareReportValidate.js';
import { clientIp, json, readJson, rateLimited } from '../lib/httpJson.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    json(res, 405, { error: 'Use POST.' });
    return;
  }
  if (!pairingConfigured()) {
    console.warn(PC_SCAN_NOT_CONFIGURED_OPS);
    json(res, 503, PC_SCAN_NOT_CONFIGURED);
    return;
  }
  const ip = clientIp(req);
  if (rateLimited(ip, 'complete')) {
    json(res, 429, { error: 'Too many upload attempts — try again later.' });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch (e) {
    json(res, e.message === 'too large' ? 413 : 400, {
      error: e.message === 'too large' ? 'Report too large.' : 'Invalid request body.',
    });
    return;
  }

  const pairingCode = body.pairingCode;
  const validated = validateHardwareReport(body.report);
  if (!validated.ok) {
    json(res, 400, { error: validated.error });
    return;
  }
  if (validated.report.scanSource !== 'desktop') {
    json(res, 400, { error: 'Desktop scanner must set scanSource to desktop.' });
    return;
  }

  const result = await completePairing(pairingCode, validated.report);
  if (result.error) {
    json(res, 400, { error: result.error });
    return;
  }
  json(res, 200, { ok: true });
}