import statsHandler from '../api/stats.js';
import recordHandler from '../api/stats/record.js';

/** Dispatch /api/stats routes for Vite dev. Returns true if handled. */
export async function dispatchStats(req, res, pathname) {
  const routes = {
    '/api/stats': statsHandler,
    '/api/stats/record': recordHandler,
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