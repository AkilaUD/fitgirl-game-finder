// Collects each repack's cover art from its FitGirl post (og:image), resumable via .tmp/images.json.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const CONC = Number(process.env.CONC) || 12;
const OUT = '.tmp/images.json';

const raw = (await readFile('.tmp/raw.jsonl', 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l));
const urls = [...new Set(raw.map((r) => r.url).filter(Boolean))];
const images = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : {};
const pending = urls.filter((u) => !images[u]);
console.error(`posts=${urls.length} pending=${pending.length}`);

let i = 0, saved = 0;
const t0 = Date.now();
let dirty = false;

async function get(url) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    } catch {
      await new Promise((res) => setTimeout(res, 700 * (a + 1)));
    }
  }
  return null;
}

async function worker() {
  while (i < pending.length) {
    const url = pending[i++];
    const html = await get(url);
    if (!html) continue;
    let img = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1]
      || html.match(/<meta name="twitter:image" content="([^"]+)"/i)?.[1]
      || '';
    img = img.replace(/&amp;/g, '&').trim();
    if (!img) continue;
    images[url] = img;
    saved++; dirty = true;
    if (saved % 100 === 0) {
      await writeFile(OUT, JSON.stringify(images));
      dirty = false;
      console.error(`saved=${saved}/${pending.length} ${((Date.now() - t0) / 60000).toFixed(1)}min`);
    }
  }
}

await Promise.all(Array.from({ length: CONC }, worker));
if (dirty) await writeFile(OUT, JSON.stringify(images));
console.error(`DONE images=${Object.keys(images).length} in ${((Date.now() - t0) / 60000).toFixed(1)}min`);
