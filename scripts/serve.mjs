// Static file server for the app, plus a small local system-info API used by "Scan my PC".
// Browsers cannot see the CPU model, exact RAM or your disk volumes, so when the app is served by
// this script it asks the machine directly. Everything stays on localhost.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { execFile } from 'node:child_process';
import { cpus, totalmem, freemem, platform, release, arch } from 'node:os';
import { dispatchPcScan } from './pcScanServe.mjs';

const root = process.cwd();
const port = Number(process.env.PORT) || 5180;

// After `npm run build`, set SERVE_DIST=1 (default when dist/index.html exists) to serve the Vite bundle.
const distDir = join(root, 'dist');
let staticRoot = root;
try {
  const useDist = process.env.SERVE_DIST === '1' || (process.env.SERVE_DIST !== '0' && (await stat(join(distDir, 'index.html'))).isFile());
  if (useDist) staticRoot = distDir;
} catch {}

// Mail settings live in .env (git-ignored) so the Resend key never reaches the browser.
async function loadEnv() {
  try {
    const raw = await readFile(join(root, '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (/^\s*#/.test(line)) continue;
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
      if (!(m[1] in process.env)) process.env[m[1]] = value;
    }
  } catch {}
}
await loadEnv();

const CONTACT_TO = process.env.CONTACT_TO || 'nexorasoftwarestudio@gmail.com';
const CONTACT_FROM = process.env.CONTACT_FROM || 'Game Finder <onboarding@resend.dev>';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function run(cmd, args) {
  return new Promise((resolve) => {
    try {
      execFile(cmd, args, { windowsHide: true, timeout: 15000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => resolve(err ? null : String(stdout)));
    } catch {
      resolve(null);
    }
  });
}

const gb = (bytes) => Math.round((Number(bytes) / 1e9) * 10) / 10;

async function windowsDrives() {
  const script = 'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object { "$($_.DeviceID)|$($_.Size)|$($_.FreeSpace)|$($_.VolumeName)" }';
  const out = await run('powershell', ['-NoProfile', '-NonInteractive', '-Command', script]);
  const drives = [];
  for (const line of (out || '').split('\n')) {
    const [mount, size, free, label] = line.trim().split('|');
    if (!mount || !size || !free) continue;
    const totalGb = gb(size);
    if (!totalGb) continue;
    drives.push({ mount, totalGb, freeGb: gb(free), label: (label || '').trim() });
  }
  if (drives.length) return drives;
  const wmic = await run('wmic', ['logicaldisk', 'get', 'DeviceID,Size,FreeSpace,VolumeName', '/format:csv']);
  for (const line of (wmic || '').split('\n')) {
    const parts = line.trim().split(',');
    if (parts.length < 5 || !/^[A-Za-z]:\\?$/.test(parts[1] || '')) continue;
    const totalGb = gb(parts[3]);
    if (totalGb) drives.push({ mount: parts[1].replace(/\\$/, ''), totalGb, freeGb: gb(parts[2]), label: parts[4] || '' });
  }
  return drives;
}

async function unixDrives() {
  const out = await run('df', ['-kP']);
  const drives = [];
  for (const line of (out || '').split('\n').slice(1)) {
    const p = line.trim().split(/\s+/);
    if (p.length < 6) continue;
    const totalKb = Number(p[1]), freeKb = Number(p[3]);
    if (!totalKb || Number.isNaN(totalKb)) continue;
    if (/^\/(dev|sys|proc|run|snap)/.test(p[0])) continue;
    drives.push({ mount: p[5], totalGb: gb(totalKb * 1024), freeGb: gb(freeKb * 1024), label: '' });
  }
  return drives;
}

async function windowsGpus() {
  const out = await run('powershell', ['-NoProfile', '-NonInteractive', '-Command', 'Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name }']);
  return (out || '').split('\n').map((s) => s.trim()).filter(Boolean);
}

let cache = null;
let cachedAt = 0;

async function systemInfo() {
  if (cache && Date.now() - cachedAt < 5000) return cache;
  const isWin = platform() === 'win32';
  const info = {
    cpu: (cpus()[0]?.model || '').replace(/\s+/g, ' ').trim() || null,
    cores: cpus().length,
    ramGb: gb(totalmem()),
    freeRamGb: gb(freemem()),
    platform: isWin ? 'Windows' : platform(),
    release: release(),
    arch: arch(),
    drives: isWin ? await windowsDrives() : await unixDrives(),
    gpus: isWin ? await windowsGpus() : [],
    source: 'local-server',
  };
  info.drives.sort((a, b) => a.mount.localeCompare(b.mount));
  info.freeGb = Math.round(info.drives.reduce((s, d) => s + d.freeGb, 0) * 10) / 10;
  cache = info;
  cachedAt = Date.now();
  return info;
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Simple flood guard: five messages per IP per ten minutes is plenty for a contact form.
const recentSends = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const hits = (recentSends.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (hits.length >= 5) return true;
  hits.push(now);
  recentSends.set(ip, hits);
  return false;
}

async function sendContactMail({ name, email, message }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { status: 503, error: 'Email is not configured: set RESEND_API_KEY in .env and restart the server.' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: CONTACT_FROM,
      to: [CONTACT_TO],
      reply_to: email,
      subject: `Game Finder — message from ${name}`,
      text: `${message}\n\n—\n${name} <${email}>`,
      html: `<p style="white-space:pre-line">${esc(message)}</p><hr><p>${esc(name)} &lt;${esc(email)}&gt;</p>`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { status: res.status, error: data.message || 'Resend rejected the message.' };
  return { id: data.id };
}

createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);

  if (url === '/api/contact') {
    const json = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST') { json(405, { error: 'Use POST.' }); return; }
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== req.headers.host) { json(403, { error: 'Cross-origin request refused.' }); return; }
    const ip = req.socket.remoteAddress || 'unknown';
    if (rateLimited(ip)) { json(429, { error: 'Too many messages — try again in a few minutes.' }); return; }
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const name = String(body.name || '').trim().slice(0, 80);
      const email = String(body.email || '').trim().slice(0, 160);
      const message = String(body.message || '').trim().slice(0, 4000);
      if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { json(400, { error: 'Name, a valid email and a message are required.' }); return; }
      const result = await sendContactMail({ name, email, message });
      if (result.error) { json(result.status || 502, { error: result.error }); return; }
      json(200, { ok: true, id: result.id });
    } catch (e) {
      json(e.message === 'too large' ? 413 : 400, { error: e.message === 'too large' ? 'Message is too long.' : 'Could not read the request.' });
    }
    return;
  }

  if (url.startsWith('/api/pc-scan/')) {
  if (await dispatchPcScan(req, res, url)) return;
  res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Not found' }));
  return;
  }

  if (url === '/api/system') {
    try {
      const info = await systemInfo();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(info));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  try {
    let rel = normalize(url === '/' ? '/index.html' : url).replace(/^([/\\])+/, '');
    let file = join(staticRoot, rel);
    if (!file.startsWith(staticRoot)) { res.writeHead(403).end('forbidden'); return; }
    const s = await stat(file).catch(() => null);
    if (s && s.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    if (staticRoot === distDir) {
      try {
        const body = await readFile(join(distDir, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(body);
        return;
      } catch {}
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`serving http://127.0.0.1:${port}${staticRoot === distDir ? ' (dist)' : ''}`);
  console.log(process.env.RESEND_API_KEY ? `mail: contact form delivers to ${CONTACT_TO}` : 'mail: RESEND_API_KEY not set — contact form will report that email is unconfigured');
});
