# Vercel deployment (single project)

Root [`vercel.json`](../vercel.json) uses the **standard Vite + `api/` layout** (not multi-service mode).

## Why not “Services” mode?

Multi-service `vercel.json` caused:

- `/api/*` **404** when API was a separate service without functions
- **Rust/Tauri gdk-3.0** build failures on Vercel Linux for `scanner/src-tauri`

Tauri and the themed `.exe` are **built on Windows** only (`npm run scanner:build-exe`). The `scanner/` web UI is dev-only unless you add a separate deploy later.

## What deploys

| Piece | On Vercel |
|-------|-----------|
| Repack Finder SPA | `dist/` from `npm run build` |
| Pairing + contact | **3** serverless functions (`api/contact.js`, `api/pc-scan.js`, `api/stats.js`) — Hobby plan limit |
| Scanner `.exe` | `public/downloads/` (and `GET /api/pc-scan/pair`) |

## Env vars

Pairing storage (one of):

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_*`)
- `BLOB_READ_WRITE_TOKEN`

Optional: `PC_SCAN_PAIR_TTL_SEC`, `ALLOWED_ORIGINS`, `RESEND_API_KEY`

## Verify after deploy

1. `GET /api/pc-scan/health` → `"ok": true`
2. **Generate pairing code** in the scan wizard

## Local dev

`npm run dev` — `/api/pc-scan/*` is served by the Vite plugin (`scripts/vitePcScanPlugin.mjs`).