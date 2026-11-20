import pairHandler from '../api/pc-scan/pair.js';
import statusHandler from '../api/pc-scan/status.js';
import completeHandler from '../api/pc-scan/complete.js';
import consumeHandler from '../api/pc-scan/consume.js';
import healthHandler from '../api/pc-scan/health.js';

/** Dispatch /api/pc-scan/* to Vercel-style handlers. Returns true if handled. */
export async function dispatchPcScan(req, res, pathname) {
  const routes = {
  '/api/pc-scan/pair': pairHandler,
  '/api/pc-scan/status': statusHandler,
  '/api/pc-scan/complete': completeHandler,
    '/api/pc-scan/consume': consumeHandler,
    '/api/pc-scan/health': healthHandler,
  };
  const handler = routes[pathname];
  if (!handler) return false;
  try {
    await handler(req, res);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message || 'Server error.' }));
  }
  return true;
}