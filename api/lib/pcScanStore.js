import { Redis } from '@upstash/redis';
import { del as blobDel, head as blobHead, put as blobPut } from '@vercel/blob';
import crypto from 'node:crypto';

const TTL_SEC = Number(process.env.PC_SCAN_PAIR_TTL_SEC) || 300;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BLOB_PREFIX = 'pcscan';

function redisCredentials() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim();
  return url && token ? { url, token } : null;
}

const STORAGE_ENV_PREFIXES = ['UPSTASH', 'KV_', 'BLOB_', 'REDIS'];

export function pairingStorageDebug() {
  const storageEnvKeys = Object.keys(process.env).filter((k) =>
    STORAGE_ENV_PREFIXES.some((p) => k.startsWith(p) || k.includes('REDIS')),
  );
  return {
    kind: storageKind(),
    hasUpstashUrl: Boolean((process.env.UPSTASH_REDIS_REST_URL || '').trim()),
    hasUpstashToken: Boolean((process.env.UPSTASH_REDIS_REST_TOKEN || '').trim()),
    hasKvUrl: Boolean((process.env.KV_REST_API_URL || '').trim()),
    hasKvToken: Boolean((process.env.KV_REST_API_TOKEN || '').trim()),
    hasBlobToken: Boolean(blobToken()),
    vercelEnv: process.env.VERCEL_ENV || null,
    storageEnvKeys,
  };
}

function blobToken() {
  const t = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return t || null;
}

function storageKind() {
  if (redisCredentials()) return 'redis';
  if (blobToken()) return 'blob';
  return 'none';
}

export function pairingConfigured() {
  return storageKind() !== 'none';
}

let redisClient = null;
function redis() {
  if (storageKind() !== 'redis') return null;
  if (!redisClient) redisClient = Redis.fromEnv();
  return redisClient;
}

function blobPath(key) {
  return `${BLOB_PREFIX}/${key.replace(/:/g, '/')}`;
}

async function blobRead(key) {
  const token = blobToken();
  if (!token) return null;
  const pathname = blobPath(key);
  try {
    const meta = await blobHead(pathname, { token });
    const res = await fetch(meta.downloadUrl);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function blobWrite(key, body) {
  const token = blobToken();
  if (!token) throw new Error('Blob token missing.');
  await blobPut(blobPath(key), body, {
    access: 'private',
    token,
    addRandomSuffix: false,
    contentType: 'application/json',
  });
}

async function blobDelete(key) {
  const token = blobToken();
  if (!token) return;
  try {
    await blobDel(blobPath(key), { token });
  } catch {
    /* ignore missing */
  }
}

async function storeGet(key) {
  const r = redis();
  if (r) return r.get(key);
  return blobRead(key);
}

async function storeSet(key, value, ttlSec) {
  const r = redis();
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (r) {
    await r.set(key, serialized, { ex: ttlSec });
    return;
  }
  await blobWrite(key, serialized);
}

async function storeDel(key) {
  const r = redis();
  if (r) {
    await r.del(key);
    return;
  }
  await blobDelete(key);
}

function randomCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

function sessionKey(sessionId) {
  return `pcscan:session:${sessionId}`;
}

function codeKey(code) {
  return `pcscan:code:${code}`;
}

function parseSession(raw) {
  if (raw == null) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function createPairingSession() {
  if (!pairingConfigured()) {
    return { error: 'Pairing storage is not configured (Upstash Redis or Vercel Blob).' };
  }

  const sessionId = crypto.randomUUID();
  let pairingCode = randomCode(6);
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await storeGet(codeKey(pairingCode));
    if (!existing) break;
    pairingCode = randomCode(6);
  }

  const now = Date.now();
  const expiresAt = new Date(now + TTL_SEC * 1000).toISOString();

  const session = {
    sessionId,
    pairingCode,
    status: 'pending',
    createdAt: new Date(now).toISOString(),
    expiresAt,
    report: null,
  };

  await storeSet(sessionKey(sessionId), session, TTL_SEC);
  await storeSet(codeKey(pairingCode), sessionId, TTL_SEC);

  return { sessionId, pairingCode, expiresAt, ttlSec: TTL_SEC };
}

export async function getSessionStatus(sessionId) {
  if (!pairingConfigured()) return { error: 'Pairing storage is not configured.' };
  const raw = await storeGet(sessionKey(sessionId));
  if (!raw) return { status: 'expired' };
  const session = parseSession(raw);
  if (Date.now() > new Date(session.expiresAt).getTime()) return { status: 'expired' };
  return { status: session.status === 'complete' ? 'complete' : 'pending', expiresAt: session.expiresAt };
}

export async function completePairing(pairingCode, report) {
  if (!pairingConfigured()) return { error: 'Pairing storage is not configured.' };

  const code = String(pairingCode || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return { error: 'Invalid pairing code format.' };

  const sessionIdRaw = await storeGet(codeKey(code));
  const sessionId = typeof sessionIdRaw === 'string' ? sessionIdRaw : String(sessionIdRaw ?? '');
  if (!sessionId) return { error: 'Pairing code expired or not found.' };

  const raw = await storeGet(sessionKey(sessionId));
  if (!raw) return { error: 'Pairing session expired.' };

  const session = parseSession(raw);
  if (session.status === 'consumed') return { error: 'This pairing code was already used.' };
  if (session.pairingCode !== code) return { error: 'Pairing code mismatch.' };
  if (Date.now() > new Date(session.expiresAt).getTime()) return { error: 'Pairing code expired.' };

  session.status = 'complete';
  session.report = report;
  session.completedAt = new Date().toISOString();

  const ttl = Math.max(30, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
  await storeSet(sessionKey(sessionId), session, ttl || TTL_SEC);
  await storeDel(codeKey(code));

  return { ok: true, sessionId };
}

export async function consumeSession(sessionId) {
  if (!pairingConfigured()) return { error: 'Pairing storage is not configured.' };

  const raw = await storeGet(sessionKey(sessionId));
  if (!raw) return { error: 'Session expired or not found.' };

  const session = parseSession(raw);
  if (session.status !== 'complete' || !session.report) {
    return { error: session.status === 'consumed' ? 'Report already retrieved.' : 'Scan not complete yet.' };
  }

  const report = session.report;
  await storeDel(sessionKey(sessionId));
  if (session.pairingCode) await storeDel(codeKey(session.pairingCode));

  return { ok: true, report };
}