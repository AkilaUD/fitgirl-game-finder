import { Redis } from '@upstash/redis';

const PREFIX = 'rf:stats';
const KEYS = {
  visits: `${PREFIX}:visits`,
  pairings: `${PREFIX}:pairings`,
  scanners: `${PREFIX}:scanners`,
};

function redisCredentials() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim();
  return url && token ? { url, token } : null;
}

export function statsConfigured() {
  return Boolean(redisCredentials());
}

let redisClient = null;
function redis() {
  if (!redisCredentials()) return null;
  if (!redisClient) redisClient = Redis.fromEnv();
  return redisClient;
}

export async function getPublicStats() {
  const r = redis();
  if (!r) return null;
  const [visits, pairings, scanners] = await Promise.all([
    r.get(KEYS.visits),
    r.get(KEYS.pairings),
    r.get(KEYS.scanners),
  ]);
  return {
    visits: toCount(visits),
    pairings: toCount(pairings),
    scannerDownloads: toCount(scanners),
  };
}

function toCount(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/** One counted visit per browser tab session id (30-day dedupe). */
export async function recordVisit(sessionId) {
  const r = redis();
  const sid = String(sessionId || '').trim().slice(0, 64);
  if (!r || !/^[a-zA-Z0-9_-]{8,64}$/.test(sid)) return false;
  const seenKey = `${PREFIX}:seen:${sid}`;
  const wasNew = await r.set(seenKey, '1', { nx: true, ex: 60 * 60 * 24 * 30 });
  if (wasNew === 'OK' || wasNew === true) {
    await r.incr(KEYS.visits);
    return true;
  }
  return false;
}

/** Optional client beacon when downloading the static .exe (pairing route counts separately). */
export async function recordScannerBeacon(sessionId) {
  const r = redis();
  const sid = String(sessionId || '').trim().slice(0, 64);
  if (!r || !/^[a-zA-Z0-9_-]{8,64}$/.test(sid)) return false;
  const seenKey = `${PREFIX}:dl:${sid}`;
  const wasNew = await r.set(seenKey, '1', { nx: true, ex: 60 * 60 * 24 * 7 });
  if (wasNew === 'OK' || wasNew === true) {
    await r.incr(KEYS.scanners);
    return true;
  }
  return false;
}

export async function recordPairingCreated() {
  const r = redis();
  if (!r) return;
  await r.incr(KEYS.pairings);
}

export async function recordScannerServed() {
  const r = redis();
  if (!r) return;
  await r.incr(KEYS.scanners);
}