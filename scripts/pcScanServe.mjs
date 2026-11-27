import gatewayHandler from '../api/pc-scan.js';

const ACTIONS = new Set(['pair', 'status', 'complete', 'consume', 'health']);

/** Dispatch /api/pc-scan/* via the same gateway as Vercel. Returns true if handled. */
export async function dispatchPcScan(req, res, pathname) {
  const action = pathname.replace(/^\/api\/pc-scan\/?/, '').split('/')[0];
  if (!ACTIONS.has(action)) return false;
  req.query = { ...(req.query || {}), action };
  req.url = `${pathname}?action=${encodeURIComponent(action)}`;
  try {
    await gatewayHandler(req, res);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message || 'Server error.' }));
  }
  return true;
}