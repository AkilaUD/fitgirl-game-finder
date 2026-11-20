export function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export async function readJson(req, limit = 256 * 1024) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) return JSON.parse(req.body);
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

const recentHits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PAIR = 15;
const MAX_COMPLETE = 10;

export function rateLimited(ip, kind) {
  const max = kind === 'complete' ? MAX_COMPLETE : MAX_PAIR;
  const now = Date.now();
  const key = `${kind}:${ip}`;
  const hits = (recentHits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= max) return true;
  hits.push(now);
  recentHits.set(key, hits);
  return false;
}

export function clientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allowed.length) return true;
  try {
    const host = new URL(origin).host;
    return allowed.some((a) => a === origin || a === host || origin.endsWith(a.replace(/^https?:\/\//, '')));
  } catch {
    return false;
  }
}