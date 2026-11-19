// Merges scraped FitGirl repacks with Steam requirement data into data/games.json
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const parseSize = (s) => {
  if (!s) return null;
  const m = String(s).match(/([\d.,]+)\s*(GB|MB)/i);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return m[2].toUpperCase() === 'MB' ? Math.round((n / 1024) * 100) / 100 : Math.round(n * 100) / 100;
};

const readJsonl = async (p) => {
  try {
    const txt = await readFile(p, 'utf8');
    return txt.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
};

const raw = await readJsonl('.tmp/raw.jsonl');
const reqs = await readJsonl('.tmp/reqs.jsonl');
let imageMap = {};
try { imageMap = JSON.parse(await readFile('.tmp/images.json', 'utf8')); } catch {}
const byUrl = new Map();
for (const r of reqs) byUrl.set(r.url, r);

const JUNK = /^(upcoming repacks|latest repacks|donations?|faq|how to install|repack features|about|contact)|patch from v|\bpatch (?:for|to)\b|– patch\b/i;
const key = (s) => String(s).toLowerCase().replace(/\s*[–-]\s*(v\d|build).*$/i, '').replace(/[^a-z0-9]+/g, '');

const seenUrl = new Set();
const byTitle = new Map();

for (const r of raw) {
  if (!r.url || !r.title || seenUrl.has(r.url)) continue;
  if (JUNK.test(r.title)) continue;
  const sizeGb = parseSize(r.repackSize);
  if (!sizeGb) continue;
  seenUrl.add(r.url);
  const st = byUrl.get(r.url) || null;
  const hasReqs = st && (st.min || st.rec);
  const tags = [...new Set([...(r.genres || []), ...((st && st.genres) || [])].map((t) => String(t).trim()).filter(Boolean))];
  let origGb = parseSize(r.originalSize);
  // A handful of posts list an impossible "original size" (e.g. 232 GB for a 179 MB repack).
  if (origGb && sizeGb && (origGb / sizeGb > 25 || origGb < sizeGb)) origGb = null;
  const game = {
    title: r.title.trim(),
    url: r.url,
    date: r.date,
    sizeGb,
    origGb,
    tags,
    companies: r.companies || '',
    languages: r.languages || '',
    img: imageMap[r.url] || null,
    steam: hasReqs ? { appid: st.appid, min: st.min, rec: st.rec } : null,
  };
  const k = key(game.title);
  const prev = byTitle.get(k);
  // Same game repacked twice (update posts): keep the newest entry, prefer the one with requirements.
  if (!prev || (game.date || '') > (prev.date || '') || (!prev.steam && game.steam)) {
    if (prev && prev.steam && !game.steam) game.steam = prev.steam;
    byTitle.set(k, game);
  }
}

const out = [...byTitle.values()].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
await mkdir('data', { recursive: true });
await writeFile('data/games.json', JSON.stringify({ generated: new Date().toISOString(), count: out.length, games: out }));

// Suggestions for the manual entry fields, taken from the requirement strings themselves.
const gpuCounts = new Map(), cpuCounts = new Map();
const bump = (map, value) => { if (value) map.set(value, (map.get(value) || 0) + 1); };
const GPU_FAMILIES = [
  [/\b(?:nvidia\s+)?(?:geforce\s+)?(rtx\s?\d{4}(?:\s?(?:ti|super))?)\b/gi, 'NVIDIA'],
  [/\b(?:nvidia\s+)?(?:geforce\s+)?(gtx\s?\d{3,4}(?:\s?(?:ti|super))?)\b/gi, 'NVIDIA'],
  [/\b(?:nvidia\s+)?(?:geforce\s+)?(gt\s?\d{3})\b/gi, 'NVIDIA'],
  [/\b(?:amd\s+)?(?:radeon\s+)?(rx\s?\d{3,4}(?:\s?xt)?)\b/gi, 'AMD'],
  [/\b(?:amd\s+)?(radeon\s?\d{3}m)\b/gi, 'AMD'],
  [/\b(?:intel\s+)?(arc\s?[ab]\d{3})\b/gi, 'Intel'],
  [/\b(?:intel\s+)?(uhd\s?graphics\s?\d{3})\b/gi, 'Intel'],
  [/\b(?:intel\s+)?(iris\s?xe(?:\s?max)?)\b/gi, 'Intel'],
  [/\b(?:intel\s+)?(hd\s?graphics\s?\d{3,4})\b/gi, 'Intel'],
];
const GPU_DISPLAY = new Map();
const tidyModel = (s) => s.replace(/\s+/g, ' ').trim()
  .replace(/\b(graphic?s|iris|xe|arc|radeon|uhd|max)\b/gi, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  .replace(/\b(rtx|gtx|gt|rx|hd|ti|super|xt)\b/gi, (w) => w.toUpperCase())
  .replace(/^(rtx|gtx|gt|rx|arc|uhd|hd)/i, (w) => w.toUpperCase());
const CPU_PATTERNS = [
  [/\b(?:intel\s+)?core\s+(i[3579])[- ](\d{4,5}[a-z]{0,2})\b/gi, (m, tier, num) => `Intel Core ${tier.toLowerCase()}-${num.toUpperCase()}`],
  [/\b(?:amd\s+)?ryzen\s+([3579])\s+(\d{4}[a-z0-9]*)\b/gi, (m, tier, num) => `AMD Ryzen ${tier} ${num.toUpperCase()}`],
  [/\b(?:intel\s+)?core\s+ultra\s+([579])\s+(\d{3}[a-z]{0,2})\b/gi, (m, tier, num) => `Intel Core Ultra ${tier} ${num.toUpperCase()}`],
];

for (const g of out) {
  if (!g.steam) continue;
  for (const block of [g.steam.min, g.steam.rec]) {
    if (!block) continue;
    if (block.gpu) {
      for (const [re, vendor] of GPU_FAMILIES) {
        for (const m of block.gpu.matchAll(re)) {
          const model = tidyModel(String(m[1]).replace(/\b(nvidia|amd|intel|geforce|radeon)\b/gi, ' '));
          if (!model) continue;
          const display = `${vendor} ${model}`;
          const key = display.toUpperCase();
          if (!GPU_DISPLAY.has(key)) GPU_DISPLAY.set(key, display);
          bump(gpuCounts, key);
        }
      }
    }
    if (block.cpu) for (const [re, fmt] of CPU_PATTERNS) for (const m of block.cpu.matchAll(re)) bump(cpuCounts, fmt(m[0], m[1], m[2]).trim());
  }
}
const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
await writeFile('data/suggestions.json', JSON.stringify({
  gpus: top(gpuCounts, 220).map((k) => GPU_DISPLAY.get(k) || k),
  cpus: top(cpuCounts, 220),
}));
console.log(`suggestions: ${gpuCounts.size} gpu names, ${cpuCounts.size} cpu names`);

const withReq = out.filter((g) => g.steam);
const withRec = out.filter((g) => g.steam && g.steam.rec);
const sizes = out.map((g) => g.sizeGb).sort((a, b) => a - b);
console.log(`games=${out.length} withRequirements=${withReq.length} withRecommended=${withRec.length}`);
console.log(`medianSize=${sizes[Math.floor(sizes.length / 2)]}GB max=${sizes[sizes.length - 1]}GB`);
console.log(`dateRange=${out[out.length - 1]?.date} .. ${out[0]?.date}`);
const byYear = {};
for (const g of out) { const y = (g.date || '').slice(0, 4); byYear[y] = (byYear[y] || 0) + 1; }
console.log('perYear', JSON.stringify(byYear));
