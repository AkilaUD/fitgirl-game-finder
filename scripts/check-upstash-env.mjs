/** Quick local check before npm run dev or CI. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadDotEnv() {
  const path = join(root, '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

loadDotEnv();

const url =
  process.env.UPSTASH_REDIS_REST_URL?.trim() ||
  process.env.KV_REST_API_URL?.trim() ||
  '';
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
  process.env.KV_REST_API_TOKEN?.trim() ||
  '';
const blob = process.env.BLOB_READ_WRITE_TOKEN?.trim() || '';

if (url && token) {
  console.log('Pairing storage: Upstash/KV credentials found in environment or .env');
  process.exit(0);
}
if (blob) {
  console.log('Pairing storage: BLOB_READ_WRITE_TOKEN found');
  process.exit(0);
}

console.error(`Pairing storage missing.

Add to .env (see .env.example):
  UPSTASH_REDIS_REST_URL=...
  UPSTASH_REDIS_REST_TOKEN=...

On Vercel: Settings → Environment Variables → enable Production + Preview + Development for both vars, then redeploy.
Guide: docs/UPSTASH_VERCEL.md
`);
process.exit(1);