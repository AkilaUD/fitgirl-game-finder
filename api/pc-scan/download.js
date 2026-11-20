import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILENAME = 'FitGirlPcScanner-portable.zip';
const __dirname = dirname(fileURLToPath(import.meta.url));
const zipPath = () => join(__dirname, '..', '_data', FILENAME);

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Use GET.' }));
    return;
  }

  try {
    const zip = await readFile(zipPath());
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${FILENAME}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Length', String(zip.length));
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(zip);
  } catch {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Scanner package not found on this deployment.' }));
  }
}