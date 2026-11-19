# Repack Finder

Filters FitGirl repacks by download size and release date, and tells you which ones your PC meets the
minimum or recommended system requirements for. Plain HTML/CSS/JS — no build step, no dependencies.

## Run

```bash
node scripts/serve.mjs
```

Open <http://127.0.0.1:5180>. Use the server rather than opening `index.html` directly: the app fetches
`data/games.json`, and the server also exposes `/api/system` for the hardware scan.

### Scan my PC

- **With the server running** the scan is exact: it reads the CPU model, total RAM, the free space on
  **every drive** (added together for the storage check) and the installed GPU names from this machine.
  It still uses the browser for the display and the GPU as a cross-check.
- **Opened as a static file, or hosted on a static host such as Vercel** it falls back to what a browser
  is allowed to see: the GPU name via WebGPU/WebGL, the thread count and a RAM figure capped at 8 GB
  (shown as `8+`). It deliberately leaves the CPU model and free disk space blank — a browser cannot read
  them, and its storage quota is not disk space — so fill those two fields in for an accurate match.

`/api/system` only exists in `scripts/serve.mjs`, so on a static host every scan is the browser estimate
above; the page probes the endpoint and falls back on its own. The same is true of `POST /api/contact`:
mail delivery needs the Node server, so a static deployment shows the form's "endpoint is not reachable"
message.

Both GPU and CPU fields accept free text with autocomplete from `data/suggestions.json` (every model
named in the requirement data), and RAM has one-click 8/16/32/64 GB presets. Every value stays
editable, and nothing is sent anywhere.

## Contact form mail (Resend)

The footer form posts to `POST /api/contact` on `scripts/serve.mjs`, which relays the message through
[Resend](https://resend.com). The API key stays on the server — `js/app.js` only talks to the local
endpoint.

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
  100) in `js/specs.js`; when a field lists alternatives ("GTX 1060 or RX 580"), the weakest one is the
  bar. Laptop parts are scaled down 13%.
- **CPU**: family + generation + model number → one scale for Intel and AMD (`i5-9400F` ≈ 21.5,
  `Ryzen 5 2600` ≈ 18.6). It is an estimate, not a benchmark.
- **RAM / storage**: parsed straight from "16 GB RAM" / "70 GB available space"; storage is compared
  against the free space you have (summed across drives).
- **Verdicts**: `Runs great` = meets recommended, `Meets minimum` = clears minimum only,
  `Below minimum` = fails a minimum field.

## Files

```
index.html, css/styles.css, js/app.js   UI
js/specs.js                             spec detection + GPU/CPU scoring + matching
data/games.json                         generated dataset (catalogue + specs + covers)
data/suggestions.json                   autocomplete lists for the hardware fields
scripts/                                scrape, match, fetch, image and build steps
```

Catalogue data comes from <https://fitgirl-repacks.site/>; requirements from Steam store listings
(bulk file: Zenodo "Steam Dataset 2025"). Sizes, specs and artwork belong to their respective
publishers. Unofficial fan tool.
