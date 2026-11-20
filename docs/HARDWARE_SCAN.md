# Hybrid PC hardware scanning

## Why CPU and disk are missing on Vercel

The site is a static SPA plus serverless APIs. Browsers cannot read the host CPU model or physical drive free space. The old `GET /api/system` route only exists when you run [`scripts/serve.mjs`](../scripts/serve.mjs) on **your** machine (`localhost`), not on Vercel’s servers.

| Mode | CPU model | RAM | GPU | Disk free space |
|------|-----------|-----|-----|-----------------|
| Browser | No | Capped estimate (`deviceMemory`) | WebGPU/WebGL name | No (quota is not disk) |
| Local `serve.mjs` | Yes | Yes | Yes | All logical drives |
| DxDiag paste | Yes | Yes | Yes | All drives in report |
| FitGirl PC Scanner | Yes | Yes | Yes | Per-volume |

## Architecture

1. **Browser scan** — immediate, [`src/lib/browserScan.ts`](../src/lib/browserScan.ts).
2. **Pairing** — `POST /api/pc-scan/pair` stores a 6-character code in **Upstash Redis** (5-minute TTL).
3. **Desktop scanner** — collects WMI/CIM data, user confirms upload, `POST /api/pc-scan/complete`.
4. **Website** — polls `GET /api/pc-scan/status`, then `POST /api/pc-scan/consume` once.
5. **Compatibility** — [`mapReportToRig`](../src/lib/mapReportToRig.ts) fills the existing rig; [`specs.ts`](../src/lib/specs.ts) scoring is unchanged.

## Vercel setup

1. Create an [Upstash Redis](https://upstash.com) database.
2. In Vercel → Settings → Environment Variables, set:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `PC_SCAN_PAIR_TTL_SEC` (optional, default 300)
   - `ALLOWED_ORIGINS` (your production + preview URLs)
   - `VITE_SCANNER_DOWNLOAD_URL` at **build** time (GitHub Release asset)
3. Redeploy.

Local dev: put the same vars in `.env` and run `node scripts/serve.mjs` plus `npm run dev` (Vite proxies `/api/pc-scan`).

## Windows scanner (Tauri)

See [`scanner/README.md`](../scanner/README.md).

Build on Windows 10/11 with Rust and Node 20+. Publish the installer to **GitHub Releases**; set `VITE_SCANNER_DOWNLOAD_URL` to that asset URL.

### Code signing

Windows SmartScreen trusts signed installers. For production, sign with an Authenticode certificate (OV/EV). Use `signtool sign /tr http://timestamp.digicert.com ...` on the built `.exe`/`.msi`. Unsigned builds still work but show an extra warning.

## Security

- One-time pairing codes, short TTL, report validated server-side (`schemaVersion: 1`).
- No secrets in the desktop app — only the public API base URL and user-entered pairing code.
- Max report size 256 KB.
- Rate limits on pair/complete endpoints (per-instance, best-effort).

## Schema

Hardware reports use `schemaVersion: 1` — see [`src/lib/hardwareReport.ts`](../src/lib/hardwareReport.ts). No serial numbers or MAC addresses.

## Testing

```bash
npm test
npm run build
```

Manual checklist:

- [ ] Browser scan shows estimates, opens wizard
- [ ] Pairing without Upstash returns clear 503
- [ ] Desktop upload + consume updates rig and game filters
- [ ] Manual fields and DxDiag still work
- [ ] `prefers-reduced-motion` unchanged