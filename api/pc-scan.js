import completeHandler from '../server/handlers/pc-scan/complete.js';
import consumeHandler from '../server/handlers/pc-scan/consume.js';
import healthHandler from '../server/handlers/pc-scan/health.js';
import pairHandler from '../server/handlers/pc-scan/pair.js';
import statusHandler from '../server/handlers/pc-scan/status.js';
import { json } from '../server/lib/httpJson.js';

const routes = {
  pair: pairHandler,
  status: statusHandler,
  complete: completeHandler,
  consume: consumeHandler,
  health: healthHandler,
};

function actionFromRequest(req) {
  const q = req.query?.action;
  if (typeof q === 'string' && q) return q;
  const raw = String(req.url || '');
  const pathOnly = raw.split('?')[0];
  const m = pathOnly.match(/\/api\/pc-scan\/([^/]+)/);
  return m?.[1] || '';
}

/** Single Vercel function — rewrites map /api/pc-scan/:action here (see vercel.json). */
export default async function handler(req, res) {
  const action = actionFromRequest(req);
  const route = routes[action];
  if (!route) {
    json(res, 404, { error: 'Not found.' });
    return;
  }
  await route(req, res);
}