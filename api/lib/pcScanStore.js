import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';

const TTL_SEC = Number(process.env.PC_SCAN_PAIR_TTL_SEC) || 300;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
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

export function pairingConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export async function createPairingSession() {
  const r = redis();
  if (!r) return { error: 'Pairing storage is not configured (Upstash Redis).' };

  const sessionId = crypto.randomUUID();
  let pairingCode = randomCode(6);
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await r.get(codeKey(pairingCode));
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

  await r.set(sessionKey(sessionId), JSON.stringify(session), { ex: TTL_SEC });
  await r.set(codeKey(pairingCode), sessionId, { ex: TTL_SEC });

  return { sessionId, pairingCode, expiresAt, ttlSec: TTL_SEC };
}

export async function getSessionStatus(sessionId) {
  const r = redis();
  if (!r) return { error: 'Pairing storage is not configured.' };
  const raw = await r.get(sessionKey(sessionId));
  if (!raw) return { status: 'expired' };
  const session = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (Date.now() > new Date(session.expiresAt).getTime()) return { status: 'expired' };
  return { status: session.status === 'complete' ? 'complete' : 'pending', expiresAt: session.expiresAt };
}

export async function completePairing(pairingCode, report) {
  const r = redis();
  if (!r) return { error: 'Pairing storage is not configured.' };

  const code = String(pairingCode || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return { error: 'Invalid pairing code format.' };

  const sessionId = await r.get(codeKey(code));
  if (!sessionId) return { error: 'Pairing code expired or not found.' };

  const raw = await r.get(sessionKey(sessionId));
  if (!raw) return { error: 'Pairing session expired.' };

  const session = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (session.status === 'consumed') return { error: 'This pairing code was already used.' };
  if (session.pairingCode !== code) return { error: 'Pairing code mismatch.' };
  if (Date.now() > new Date(session.expiresAt).getTime()) return { error: 'Pairing code expired.' };

  session.status = 'complete';
  session.report = report;
  session.completedAt = new Date().toISOString();

  const ttl = Math.max(30, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
  await r.set(sessionKey(sessionId), JSON.stringify(session), { ex: ttl || TTL_SEC });
  await r.del(codeKey(code));

  return { ok: true, sessionId };
}

export async function consumeSession(sessionId) {
  const r = redis();
  if (!r) return { error: 'Pairing storage is not configured.' };

  const raw = await r.get(sessionKey(sessionId));
  if (!raw) return { error: 'Session expired or not found.' };

  const session = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (session.status !== 'complete' || !session.report) {
    return { error: session.status === 'consumed' ? 'Report already retrieved.' : 'Scan not complete yet.' };
  }

  const report = session.report;
  await r.del(sessionKey(sessionId));
  if (session.pairingCode) await r.del(codeKey(session.pairingCode));

  return { ok: true, report };
}