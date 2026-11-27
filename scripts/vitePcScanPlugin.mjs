import { dispatchPcScan } from './pcScanServe.mjs';
import { dispatchStats } from './statsServe.mjs';

/** Serve /api/pc-scan/* and /api/stats* inside Vite dev without requiring serve.mjs on :5180 */
export function vitePcScanPlugin(env) {
  return {
    name: 'vite-pc-scan-api',
    configureServer(server) {
      for (const [k, v] of Object.entries(env)) {
        if (v && process.env[k] === undefined) process.env[k] = v;
      }

      server.middlewares.use((req, res, next) => {
        const pathname = decodeURIComponent((req.url || '').split('?')[0]);
        const isPcScan = pathname.startsWith('/api/pc-scan/');
        const isStats = pathname === '/api/stats' || pathname === '/api/stats/record';
        if (!isPcScan && !isStats) {
          next();
          return;
        }

        const dispatch = isPcScan ? dispatchPcScan : dispatchStats;
        void dispatch(req, res, pathname)
          .then((handled) => {
            if (!handled && !res.writableEnded) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Not found' }));
            }
          })
          .catch((e) => {
            if (!res.writableEnded) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: e?.message || 'Server error.' }));
            }
          });
      });
    },
  };
}