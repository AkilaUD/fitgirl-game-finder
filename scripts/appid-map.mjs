// Builds a title -> Steam appid map from the local steamdb dump (200k games), using the shared
// same-game rules in lib/titles.mjs so sequels never inherit the wrong game's requirements.
// The dump is gunzipped in a stream and parsed with a small brace-depth scanner (no 360MB JSON.parse).
import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { cleanTitle, coreKey, sequelNumbers, sameGame } from './lib/titles.mjs';

const GZ = '.tmp/steamdb.min.json.gz';
const OUT = '.tmp/appid-map.json';

function extractRecords(onRecord) {
  return new Promise((resolve, reject) => {
    const rs = createReadStream(GZ).pipe(createGunzip());
    let buf = '';
    let depth = 0, inStr = false, esc = false, inRecord = false;
    rs.on('data', (chunk) => {
      const s = chunk.toString('utf8');
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (inStr) {
          buf += c;
          if (esc) esc = false;
          else if (c === '\\') esc = true;
          else if (c === '"') inStr = false;
          continue;
        }
        if (c === '"') { inStr = true; if (inRecord) buf += c; continue; }
        if (c === '{') { if (!inRecord) { inRecord = true; buf = ''; } buf += c; depth++; continue; }
        if (c === '}') {
          if (!inRecord) continue;
          buf += c;
          depth--;
          if (depth === 0) {
            try { onRecord(JSON.parse(buf)); } catch {}
            buf = ''; inRecord = false;
          }
          continue;
        }
        if (inRecord) buf += c;
      }
    });
    rs.on('end', resolve);
    rs.on('error', reject);
  });
}

// core key -> [{ appid, name }]
const byKey = new Map();
let scanned = 0;

await extractRecords((rec) => {
  scanned++;
  if (!rec.steam_appid || !rec.name || rec.kind !== 'steam') return;
  const key = coreKey(rec.name);
  if (!key) return;
  const list = byKey.get(key);
  if (list) list.push({ appid: rec.steam_appid, name: rec.name });
  else byKey.set(key, [{ appid: rec.steam_appid, name: rec.name }]);
});

const raw = readFileSync('.tmp/raw.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const wanted = new Map(); // cleaned title -> urls
for (const r of raw) {
  if (!r.url || !r.title) continue;
  const title = cleanTitle(r.title);
  if (title.length < 2) continue;
  if (!wanted.has(title)) wanted.set(title, []);
  wanted.get(title).push(r.url);
}

const map = {};
const rejected = [];
let matched = 0;

for (const [title, urls] of wanted) {
  const candidates = byKey.get(coreKey(title)) || [];
  if (!candidates.length) continue;

  // Only candidates that pass the full same-game check survive; sequel numbers must match.
  const good = candidates.filter((c) => sameGame(title, c.name));
  if (!good.length) {
    if (candidates.length) rejected.push({ title, candidates: candidates.slice(0, 3).map((c) => c.name) });
    continue;
  }
  // Prefer an exact title match, then the shortest name (base game over "… Deluxe Edition").
  good.sort((a, b) => (a.name.length - b.name.length) || (a.appid - b.appid));
  const pick = good[0];
  matched++;
  for (const u of urls) map[u] = pick.appid;
}

await writeFile(OUT, JSON.stringify(map));
console.error(`scanned=${scanned} catalogKeys=${byKey.size} titles=${wanted.size} matched=${matched} (${(matched / wanted.size * 100).toFixed(0)}%) rejectedAmbiguous=${rejected.length}`);
for (const r of rejected.slice(0, 10)) console.error(`  refused "${r.title}" -> ${JSON.stringify(r.candidates)}`);
