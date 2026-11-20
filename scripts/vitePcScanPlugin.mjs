import scannerDownload from '../api/scanner-download.js';
import { dispatchPcScan } from './pcScanServe.mjs';

/** Serve /api/pc-scan/* inside Vite dev without requiring serve.mjs on :5180 */
export function vitePcScanPlugin(env) {
  return {
    name: 'vite-pc-scan-api',
    configureServer(server) {
      for (const [k, v] of Object.entries(env)) {
        if (v && process.env[k] === undefined) process.env[k] = v;
      }

      server.middlewares.use((req, res, next) => {
        const pathname = decodeURIComponent((req.url || '').split('?')[0]);
        if (pathname === '/api/scanner-download') {
          void scannerDownload(req, res).catch((e) => {
            if (!res.writableEnded) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: e?.message || 'Server error.' }));
            }
          });
          return;
        }
        if (!pathname.startsWith('/api/pc-scan/')) {
          next();
          return;
        }

        void dispatchPcScan(req, res, pathname)
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