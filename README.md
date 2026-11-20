# Repack Finder

Filters FitGirl repacks by download size and release date, and tells you which ones your PC meets the
minimum or recommended system requirements for. The UI is a **Vite + React + TypeScript** SPA with a
game-launcher aesthetic (WebGL backdrop, Motion UI, HUD panels).

## Run (development)

```bash
npm install
node scripts/serve.mjs
npm run dev
```

Open <http://127.0.0.1:5173>. Vite proxies `/api/system` and `/api/contact` to the helper on port **5180**,
which also serves static files if you prefer the built bundle (see below).

The app loads `public/data/games.json`. After refreshing the dataset, copy the JSON into `public/data/`:

```powershell
Copy-Item data\games.json, data\suggestions.json public\data\
```

## Production build

```bash
npm run build
node scripts/serve.mjs
```

When `dist/index.html` exists, `serve.mjs` serves the built SPA automatically (set `SERVE_DIST=0` to force
the repo root). Deploy `dist/` to Vercel with `vercel.json`; `api/contact.js` stays at the project root.

### Scan my PC (hybrid)

See **[docs/HARDWARE_SCAN.md](docs/HARDWARE_SCAN.md)** for pairing, Upstash Redis env vars, and the Windows scanner.

- **Browser scan** — immediate GPU / thread / RAM estimates in the scan wizard.
- **FitGirl PC Scanner** (Tauri, [`scanner/`](scanner/)) — pairing code upload for full CPU, RAM, GPU, and disk volumes on Vercel.
- **With the server running** the scan is exact: it reads the CPU model, total RAM, the free space on
  **every drive** (added together for the storage check) and the installed GPU names from this machine.
  It still uses the browser for the display and the GPU as a cross-check.
- **Opened as a static file, or hosted on a static host such as Vercel** it falls back to what a browser
  is allowed to see: the GPU name via WebGPU/WebGL, the thread count and a RAM figure capped at 8 GB
  (shown as `8+`). It deliberately leaves the CPU model and free disk space blank — a browser cannot read
  them, and its storage quota is not disk space — so fill those two fields in for an accurate match.
- **On a hosted copy**, open the **DxDiag** box under the hardware fields and paste the text of
  `DxDiag.txt` (Win+R → `dxdiag` → *Save All Information…*). The report is parsed in the tab — nothing is
  uploaded — and fills in the CPU model, total RAM, GPU and the free space on every drive, which is the
  same hardware profile the local helper reports. Ctrl+Enter in the box does the same as the button.

`/api/system` only exists in `scripts/serve.mjs`, and a remote server could not read your hardware anyway
(it would just describe the server). So the page only asks the helper when it is opened on a local or
private address (`localhost`, `127.x`, `192.168.x`, `10.x`, `172.16–31.x`, `*.local`); on a static host
such as Vercel there is no `/api/system` request and the scan is the browser estimate above. Behind a
domain, add `?helper=1` to force the probe, or `?helper=0` to turn it off.

`python scripts/dxdiag.py` prints the same profile as JSON (`--keep` also keeps the raw report), for when
you want the specs outside the local server. It converts dxdiag's binary MiB/GiB figures to the decimal
GB that `serve.mjs` and the app use, so the two agree.

`POST /api/contact` is different: `api/contact.js` is a Vercel serverless function that delivers the same
way from a hosted deployment, so the contact form keeps working there (see below).

Both GPU and CPU fields accept free text with autocomplete from `data/suggestions.json` (every model
named in the requirement data), and RAM has one-click 8/16/32/64 GB presets. Every value stays
editable, and nothing is sent anywhere.

## Contact form mail (Resend)

The footer form posts to `POST /api/contact`, handled by `scripts/serve.mjs` when you run the app
locally and by `api/contact.js` on Vercel. Both relay the message through [Resend](https://resend.com).
The API key stays on the server — the React app only talks to that endpoint.

Settings come from `.env` (git-ignored; `.env.example` is the template):

```
RESEND_API_KEY=re_...
CONTACT_TO=nexorasoftwarestudio@gmail.com
CONTACT_FROM=Repack Finder <onboarding@resend.dev>
```

`onboarding@resend.dev` is Resend's test sender and only delivers to the Resend account owner's own
address, so `CONTACT_TO` must match it until you verify a domain in Resend and point `CONTACT_FROM` at
an address on that domain. Replies go back to whatever email the visitor typed (`reply_to`). The
endpoint rejects cross-origin posts, caps requests at 5 per IP per 10 minutes, and reports a clear
error when the key is missing.

### Deploying to Vercel

`api/contact.js` is a plain Vercel Node function; Vercel picks up anything in `api/` automatically, so
there is no build step and nothing to install. Set the variables in **Project → Settings → Environment
Variables** (for Production and Preview) and redeploy — `.env` is git-ignored, so the deployed function
only sees the Vercel environment:

| Variable | Required | Value |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | your Resend key (`re_...`) |
| `CONTACT_TO` | no | where messages go, defaults to `nexorasoftwarestudio@gmail.com` |
| `CONTACT_FROM` | no | defaults to `Repack Finder <onboarding@resend.dev>` |

Until a domain is verified in Resend, keep the default sender and make sure `CONTACT_TO` is the Resend
account owner's own address. The 5-messages-per-10-minutes guard lives in each function instance, so on
Vercel it is best-effort; Resend's own rate limits still apply. `/api/system` has no hosted counterpart
on purpose — see above.

## Refresh the data

The pipeline writes into `.tmp/` and ends with `data/games.json` + `data/suggestions.json`.

```bash
node scripts/scrape-fitgirl.mjs                 # 1. catalogue: titles, dates, tags, sizes
node scripts/scrape-images.mjs                  # 2. cover art from each post (resumable)

curl -L -o .tmp/steamdb.min.json.gz \
  https://github.com/leinstay/steamdb/releases/latest/download/steamdb.min.json.gz
node scripts/appid-map.mjs                      # 3. map repack titles -> Steam app ids

# 4a. bulk requirements: parsed Steam requirements for the whole store (320 MB, one-off)
curl -L -o .tmp/steam2025.zip \
  https://zenodo.org/api/records/17266923/files/steam_dataset_2025_csv_package_v1.zip/content
python scripts/zenodo-requirements.py

# 4b. top-up for anything the bulk file missed or released since (resumable, rate-limited)
GAP=1700 node scripts/steam-requirements.mjs

node scripts/build-data.mjs                     # 5. rebuild the dataset + suggestions
```

All steps resume: delete the matching `.tmp/*.jsonl` / `.tmp/*.json` file to start that step over.
`build-data.mjs` also runs automatically when step 4b finishes a run.

The two bulk downloads (Steam catalogue dump, Zenodo archive) are only needed while that step runs and
take ~360 MB together. They are not part of the app — `node scripts/clean.mjs` deletes the whole `.tmp`
cache at any time, and `data/` keeps working.

**Coverage:** ~4,100 of 5,301 repacks (77%) have published requirements. The remaining ~1,200 are
almost entirely titles Steam does not list — Switch emulator releases, regional or adult-only games —
so there is no PC requirement data to fetch. Those are labelled "No spec data" rather than guessed at.

**On timing:** step 1 is ~10 min for ~8,000 posts, step 2 ~8 min for ~5,300 covers, step 3 is offline
once the dump is downloaded. Step 4a is one 320 MB download (~10-20 min on a slow link). Step 4b talks
to Steam, which allows roughly 200 requests per 5 minutes per IP: `GAP=1700` is about 35/min and backs
off automatically on HTTP 429, newest releases first.

## How app ids are matched

Repack titles are matched to Steam apps by `scripts/appid-map.mjs` using the rules in
`scripts/lib/titles.mjs`, which both importers reuse to validate every answer:

- titles are stripped of repack wrapping (`#4439`, `, v1.2`, `Build 1835`, `+ 4 DLCs`, `(Switch 2)`),
  accents folded and edition words ignored (`Deluxe`, `GOTY`, `Remastered`, `Black Edition`…);
- **sequel numbers must match exactly** — `The Outer Worlds` can never take `The Outer Worlds 2`, and
  `Layers of Fear 2` cannot fall back to the 2016 original. Release years (`(2016)`, `2024`) are not
  treated as sequel numbers;
- the identifying words must be identical, so near-misses like `Cairn` → `Cairns` are refused instead of
  being guessed;
- when nothing passes, the game is left without specs and shown as "No spec data"
  (`The Outer Worlds` is one: Steam only lists the *Spacer's Choice* re-release).

## How hardware matching works

- **GPU**: the card named in the requirements is looked up in a relative performance index (RTX 4090 =
  100) in `src/lib/specs.ts`; when a field lists alternatives ("GTX 1060 or RX 580"), the weakest one is the
  bar. Laptop parts are scaled down 13%.
- **CPU**: family + generation + model number → one scale for Intel and AMD (`i5-9400F` ≈ 21.5,
  `Ryzen 5 2600` ≈ 18.6). It is an estimate, not a benchmark.
- **RAM / storage**: parsed straight from "16 GB RAM" / "70 GB available space"; storage is compared
  against the free space you have (summed across drives).
- **Verdicts**: `Runs great` = meets recommended, `Meets minimum` = clears minimum only,
  `Below minimum` = fails a minimum field.

## Files

```
src/                    React UI, hooks, VFX (Three.js / Motion)
src/lib/specs.ts        spec detection + GPU/CPU scoring + matching
public/data/*.json      dataset served to the browser (copy from data/ after rebuild)
data/*.json             output of build-data.mjs (pipeline)
scripts/                scrape, match, fetch, image and build steps
api/contact.js          Vercel serverless contact handler
```

Catalogue data comes from <https://fitgirl-repacks.site/>; requirements from Steam store listings
(bulk file: Zenodo "Steam Dataset 2025"). Sizes, specs and artwork belong to their respective
publishers. Unofficial fan tool.
