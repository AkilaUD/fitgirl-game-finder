// Serverless twin of POST /api/contact in scripts/serve.mjs, so the footer form also works on
// the deployed site. The Resend key is never in the page: it comes from an environment variable.
//
// On Vercel set RESEND_API_KEY in Project → Settings → Environment Variables and redeploy.
// CONTACT_TO and CONTACT_FROM are optional (defaults below). Use CONTACT_FROM with a verified
// domain later; onboarding@resend.dev only delivers to the Resend account owner's address.

const RESEND_URL = 'https://api.resend.com/emails';
const MAX_BODY = 64 * 1024;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// Best-effort flood guard. Each serverless instance has its own memory, so this throttles
// repeated requests that land on the same instance rather than acting as a global quota.
const recentSends = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const hits = (recentSends.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return true;
  hits.push(now);
  recentSends.set(ip, hits);
  if (recentSends.size > 1000) {
    for (const [key, times] of recentSends) if (!times.some((t) => now - t < WINDOW_MS)) recentSends.delete(key);
  }
  return false;
}

// Vercel pre-parses JSON bodies; accept that, a raw string, or a plain stream.
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) return JSON.parse(req.body);
  if (req && typeof req[Symbol.asyncIterator] === 'function') {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) throw new Error('too large');
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  }
  return {};
}

async function sendContactMail({ name, email, message }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('RESEND_API_KEY is not set on this deployment.');
    return { status: 503, error: 'Email is not available right now. Please try again later.' };
  }
  const from = process.env.CONTACT_FROM || 'Repack Finder <onboarding@resend.dev>';
  const to = process.env.CONTACT_TO || 'nexorasoftwarestudio@gmail.com';
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `Repack Finder — message from ${name}`,
      text: `${message}\n\n—\n${name} <${email}>`,
      html: `<p style="white-space:pre-line">${esc(message)}</p><hr><p>${esc(name)} &lt;${esc(email)}&gt;</p>`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { status: res.status, error: data.message || 'Resend rejected the message.' };
  return { id: data.id };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    json(res, 405, { error: 'Use POST.' });
    return;
  }

  const origin = req.headers.origin;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (origin) {
    let originHost = '';
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = '';
    }
    if (originHost !== host) {
      json(res, 403, { error: 'Cross-origin request refused.' });
      return;
    }
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) {
    json(res, 429, { error: 'Too many messages — try again in a few minutes.' });
    return;
  }

  try {
    const body = await readJson(req);
    const name = String(body.name || '').trim().slice(0, 80);
    const email = String(body.email || '').trim().slice(0, 160);
    const message = String(body.message || '').trim().slice(0, 4000);
    if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      json(res, 400, { error: 'Name, a valid email and a message are required.' });
      return;
    }
    const result = await sendContactMail({ name, email, message });
    if (result.error) {
      json(res, result.status || 502, { error: result.error });
      return;
    }
    json(res, 200, { ok: true, id: result.id });
  } catch (e) {
    const tooLarge = e.message === 'too large';
    json(res, tooLarge ? 413 : 400, { error: tooLarge ? 'Message is too long.' : 'Could not read the request.' });
  }
};
