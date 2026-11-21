# Vercel Services layout

Configured in root [`vercel.json`](../vercel.json).

## Services

| Service | Root | Role on Vercel |
|---------|------|----------------|
| **app** | `.` | Public — Vite SPA **plus** `api/` serverless (pairing, contact, scanner download) |
| **scanner** | `scanner` | Public at `/scanner` — Tauri dev UI only (no WMI in the browser) |
| **src-tauri** | `scanner/src-tauri` | **Listed for Vercel auto-detect only** — `ignoreCommand: exit 0` skips cloud build; use `npm run scanner:build-exe` on Windows |

## Public rewrites (most specific first)

1. `/api/*` → **app** (pairing, contact, installer `GET` on `/api/pc-scan/pair`; diagnostic `GET /api/pc-scan/health`)
2. `/scanner`, `/scanner/*` → **scanner**
3. `/downloads/*`, `/assets/*`, `/data/*` → **app**
4. SPA fallback → `/index.html` on **app** (excludes `api/`, `downloads/`, `scanner`)

## Bindings

**None.** You chose same-origin browser calls and public API URLs for the desktop `.exe` (no internal service-to-service HTTP).

If you later split a private API service, add on the caller:

```json
"bindings": [
  { "type": "service", "service": "api", "format": "url", "env": "API_URL" }
]
```

Use `process.env.API_URL` only in serverless code (not in Vite client bundles).

## Code paths

| Caller | API base |
|--------|-----------|
| Repack Finder (`usePcScanPairing`) | Relative `/api/*` via [`src/lib/apiBase.ts`](../src/lib/apiBase.ts); optional `VITE_PC_SCAN_API_BASE` |
| Scanner web UI (`scanner/src/App.tsx`) | `window.location.origin` (same Vercel domain → **app** `/api/*`) |
| Desktop `.exe` / Tauri | User-entered or default production URL |

## Env vars (Vercel project — **app**)

- Pairing storage: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_*`), **or** `BLOB_READ_WRITE_TOKEN` — see [HARDWARE_SCAN.md](HARDWARE_SCAN.md)
- `RESEND_API_KEY`
- Optional: `ALLOWED_ORIGINS`, `PC_SCAN_PAIR_TTL_SEC`

## Local dev

- Website: `npm run dev`
- All services: `vercel dev` (see [Services docs](https://vercel.com/docs/services))
- Tauri desktop: `cd scanner && npm run tauri dev`