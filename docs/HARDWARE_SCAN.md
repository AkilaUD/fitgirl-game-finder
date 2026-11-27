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

Full checklist (Production + Preview + Development): **[docs/UPSTASH_VERCEL.md](UPSTASH_VERCEL.md)**.

Pairing needs **shared storage** (serverless cannot use in-memory). Pick **one**:

### Option A — Upstash Redis (recommended)

1. Vercel → your project → **Storage** → **Create** → **Upstash** → **Redis** → connect to this project (auto-injects `UPSTASH_*` or `KV_REST_*` vars).
2. Or create a DB at [Upstash](https://upstash.com) and paste into **Settings → Environment Variables**:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Option B — Vercel Blob

1. Vercel → **Storage** → **Blob** → connect to this project (`BLOB_READ_WRITE_TOKEN` is injected).
2. Redeploy.

3. **Redeploy** after storage is connected.

Optional env (Settings → Environment Variables):

- `PC_SCAN_PAIR_TTL_SEC` (default 300)
- `ALLOWED_ORIGINS` (your production + preview URLs)
- `VITE_SCANNER_DOWNLOAD_URL` — overrides the default `/downloads/FitGirlPcScanner-setup.exe`

Local dev: put the same vars in `.env` and run `npm run dev` — Vite serves `/api/pc-scan/*` directly (no need for `serve.mjs` on port 5180 for pairing). Optional: run `node scripts/serve.mjs` for `/api/system` local hardware.

## Windows scanner (Tauri)

See [`scanner/README.md`](../scanner/README.md).

Build on Windows 10/11 with Rust and Node 20+. From the repo root:

```bash
npm run scanner:build
```

That runs Tauri and copies the installer to [`public/downloads/`](../public/downloads/). Commit `FitGirlPcScanner-setup.exe` so Vercel ships it as a **direct download** from your domain (no GitHub Releases required).

### Windows scanner `.exe` (Repack Finder theme)

Built with `npm run scanner:build-exe` on Windows (`scripts/scanner-win/` — WinForms UI matching the site: dark panel, neon pink/cyan). The download is a single portable app (no installer); WMI collection runs in-process.

### SmartScreen (“Windows protected your PC”)

Unsigned community builds are flagged until **Authenticode**-signed. Users should click **More info** → **Run anyway**. The in-app and website wizard explain this; signing removes the prompt over time.

To sign after build, set env vars and rebuild on a machine with the Windows SDK `signtool`:

- `SCANNER_CODESIGN_PFX` — path to `.pfx`
- `SCANNER_CODESIGN_PASSWORD` — optional

Or: `signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /f cert.pfx public/downloads/FitGirlPcScanner-setup.exe`

OV/EV code-signing certificates are the long-term fix for SmartScreen reputation.

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