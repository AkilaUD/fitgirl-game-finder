import statsHandler from '../api/stats.js';

/** Dispatch /api/stats routes for Vite dev. Returns true if handled. */
export async function dispatchStats(req, res, pathname) {
  if (pathname !== '/api/stats' && pathname !== '/api/stats/record') return false;
  if (pathname === '/api/stats/record') {
    req.url = '/api/stats?record=1';
  }
  try {
    await statsHandler(req, res);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message || 'Server error.' }));
  }
  return true;
}