// Fetches Steam minimum/recommended requirements for repacks using the local appid map.
// Single-flight + paced to stay under Steam's store API rate limit; backs off on 429 and resumes
// from cache. Newest games are fetched first so coverage is best where it matters most.
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { cleanTitle, sameGame } from './lib/titles.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const OUT = '.tmp/reqs.jsonl';
const SKIP = '.tmp/reqs-skip.json';
let gap = Number(process.env.GAP) || 450;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

import { parseReq } from './lib/requirements.mjs';

const raw = (await readFile('.tmp/raw.jsonl', 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l));
const appids = JSON.parse(await readFile('.tmp/appid-map.json', 'utf8'));

const seen = new Set();
const queue = raw
  .filter((r) => r.url && r.title && appids[r.url] && !seen.has(r.url) && seen.add(r.url))
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

const done = new Set();
if (existsSync(OUT)) for (const l of (await readFile(OUT, 'utf8')).split('\n')) { try { done.add(JSON.parse(l).url); } catch {} }
const skip = new Set(existsSync(SKIP) ? JSON.parse(await readFile(SKIP, 'utf8')) : []);

const LIMIT = Number(process.env.LIMIT) || 0;
let pending = queue.filter((g) => !done.has(g.url) && !skip.has(g.url));
if (LIMIT) pending = pending.slice(0, LIMIT);
console.error(`queue=${queue.length} pending=${pending.length} gap=${gap}ms`);

process.on('uncaughtException', (e) => { console.error('FATAL', e && e.stack || e); process.exit(1); });
process.on('unhandledRejection', (e) => { console.error('FATAL-REJECT', e && e.stack || e); process.exit(1); });

let blocked = 0, ok = 0, noreq = 0, processed = 0;
const t0 = Date.now();
let gapMs = gap;

async function fetchOne(appid) {
  let r;
  try {
    r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=english&cc=us`, {
      headers: { 'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    // A dropped connection must not kill a long run.
    return { retry: true, error: e.message };
  }
  if (r.status === 429 || r.status === 403) return { throttled: true, status: r.status };
  if (!r.ok) return { error: r.status };
  const txt = await r.text();
  try {
    const data = JSON.parse(txt);
    if (process.env.DEBUG) console.error('  debug', appid, r.status, 'len', txt.length, 'keys', data ? Object.keys(data).slice(0, 2) : 'null');
    return { data };
  } catch { return { error: 'badjson', body: txt.slice(0, 60) }; }
}

for (const g of pending) {
  const appid = appids[g.url];
  let attempt = 0;
  let result = null;
  while (attempt < 6) {
    const started = Date.now();
    result = await fetchOne(appid);
    if (result.retry) {
      console.error('  network error, retrying:', result.error);
      await sleep(5000 * (attempt + 1));
      attempt++;
      continue;
    }
    if (!result.throttled) break;
    blocked++;
    gapMs = Math.min(gapMs * 1.5, 2500);
    const pause = 60000 + attempt * 30000;
    console.error(`429 (backoff #${blocked}); sleeping ${pause / 1000}s, gap ${Math.round(gapMs)}ms`);
    await sleep(pause);
    attempt++;
  }
  if (!result || result.throttled) { skip.add(g.url); processed++; continue; }
  if (result.error) console.error('  http error', result.error, result.body || '');

  const data = result.data?.[appid]?.success ? result.data[appid].data : null;
  // Refuse the answer if the app Steam returned is not the game we asked about (wrong sequel, DLC, demo).
  if (data?.name && !sameGame(cleanTitle(g.title), data.name)) {
    console.error(`  refused mismatch: "${cleanTitle(g.title)}" != "${data.name}" (appid ${appid})`);
    skip.add(g.url);
    processed++;
    continue;
  }
  const rec = {
    url: g.url,
    appid,
    name: data?.name || null,
    min: parseReq(data?.pc_requirements?.minimum),
    rec: parseReq(data?.pc_requirements?.recommended),
    genres: (data?.genres || []).map((x) => x.description),
  };
  if (rec.min || rec.rec) { ok++; await appendFile(OUT, JSON.stringify(rec) + '\n'); }
  else { noreq++; skip.add(g.url); }
  processed++;

  if (processed % 100 === 0) {
    const mins = ((Date.now() - t0) / 60000).toFixed(1);
    const rate = (processed / Math.max(1, Date.now() - t0) * 60000).toFixed(0);
    console.error(`processed=${processed}/${pending.length} withReqs=${ok} noReqs=${noreq} ${mins}min ${rate}/min`);
    await writeFile(SKIP, JSON.stringify([...skip]));
  }
  await sleep(gapMs);
}

await writeFile(SKIP, JSON.stringify([...skip]));
console.error(`DONE withReqs=${ok} noReqs=${noreq} throttled=${blocked} in ${((Date.now() - t0) / 60000).toFixed(1)}min`);
// Refresh the dataset so the app picks up everything collected in this run.
try { await import('./build-data.mjs'); } catch (e) { console.error('rebuild failed', e.message); }
