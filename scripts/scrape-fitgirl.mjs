// Scrapes FitGirl Repacks post sitemaps and extracts the structured header of every repack:
// title, publish date, genres/tags, companies, languages, original size and repack size.
// Writes .tmp/raw.jsonl incrementally so an interrupted run can resume.
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const BASE = 'https://fitgirl-repacks.site';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const CONCURRENCY = Number(process.env.CONC) || 12;
const RAW = '.tmp/raw.jsonl';
const URLS_CACHE = '.tmp/urls.json';

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#8211': '\u2013', '#8217': '\u2019', '#8216': '\u2018', '#8220': '\u201C', '#8221': '\u201D', '#8230': '\u2026', '#038': '&', '#39': "'" };
function decode(s) {
  return s.replace(/&(#?\w+);/g, (m, e) => (ENT[e] !== undefined ? ENT[e] : m)).replace(/\s+/g, ' ').trim();
}

function strip(html) {
  return decode(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '));
}

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, redirect: 'follow' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    } catch (e) {
      if (i === tries - 1) return null;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  return null;
}

async function collectUrls() {
  if (existsSync(URLS_CACHE)) return JSON.parse(await readFile(URLS_CACHE, 'utf8'));
  const index = await get(`${BASE}/sitemap.xml`);
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /post-sitemap\d*\.xml$/.test(u));
  console.error('post sitemaps:', maps.length);
  const urls = new Set();
  for (const m of maps) {
    const xml = await get(m);
    if (!xml) { console.error('failed sitemap', m); continue; }
    for (const u of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(u[1]);
    console.error('  ', m.split('/').pop(), urls.size);
  }
  const list = [...urls];
  await writeFile(URLS_CACHE, JSON.stringify(list));
  return list;
}

function parsePost(url, html) {
  const text = strip(html);
  const titleTag = html.match(/<h1[^>]*entry-title[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  let title = titleTag ? decode(titleTag[1].replace(/<[^>]+>/g, '')) : '';
  if (!title) {
    const og = html.match(/<meta property="og:title" content="([^"]*)"/i);
    title = og ? decode(og[1]) : url;
  }
  const time = html.match(/<time[^>]*datetime="([^"]+)"/i) || html.match(/article:published_time" content="([^"]+)"/i);
  const date = time ? time[1] : null;

  const g = text.match(/Genres\/Tags:\s*(.*?)\s*Companies:/i);
  const c = text.match(/Companies:\s*(.*?)\s*Languages:/i);
  const l = text.match(/Languages:\s*(.*?)\s*Original Size:/i);
  const orig = text.match(/Original Size:\s*([\d.,]+\s*(?:GB|MB))/i);
  const repack = text.match(/Repack Size:\s*([\d.,]+\s*(?:GB|MB))/i);
  const num = text.match(/#(\d{3,5})\s/);
  const cut = /Repack Features/i.test(text) ? (/Nothing (?:is )?(?:re-?encoded|cut)/i.test(text) ? 'lossless' : 'compressed') : '';

  return {
    url,
    title,
    date: date ? date.slice(0, 10) : null,
    genres: g ? g[1].split(',').map((s) => s.trim()).filter(Boolean) : [],
    companies: c ? c[1].trim() : '',
    languages: l ? l[1].trim() : '',
    originalSize: orig ? orig[1].replace(/\s+/g, ' ') : null,
    repackSize: repack ? repack[1].replace(/\s+/g, ' ') : null,
    number: num ? Number(num[1]) : null,
    kind: cut,
  };
}

const urls = await collectUrls();
console.error('total post urls:', urls.length);

const done = new Set();
if (existsSync(RAW)) {
  for (const line of (await readFile(RAW, 'utf8')).split('\n')) {
    if (!line.trim()) continue;
    try { done.add(JSON.parse(line).url); } catch {}
  }
}
const queue = urls.filter((u) => !done.has(u) && !/\/(category|tag|author|page)\//.test(u));
console.error('to fetch:', queue.length, 'already done:', done.size);

let i = 0, saved = 0, failed = 0;
const started = Date.now();

async function worker() {
  while (i < queue.length) {
    const url = queue[i++];
    const html = await get(url);
    if (!html) { failed++; continue; }
    const rec = parsePost(url, html);
    if (rec.repackSize && rec.title) {
      await appendFile(RAW, JSON.stringify(rec) + '\n');
      saved++;
    }
    if (saved % 100 === 0 && saved) {
      const mins = ((Date.now() - started) / 60000).toFixed(1);
      console.error(`saved=${saved} failed=${failed} progress=${i}/${queue.length} ${mins}min`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.error(`DONE saved=${saved} failed=${failed} in ${((Date.now() - started) / 60000).toFixed(1)}min`);
