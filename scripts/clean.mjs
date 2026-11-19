// Removes the .tmp working cache (scraped pages, bulk downloads, intermediate JSON).
// The app only needs data/*.json, so this is always safe; the pipeline just re-downloads what it needs.
import { rm, stat } from 'node:fs/promises';

async function dirSize(path) {
  // Best-effort size report; ignore errors on locked files.
  const { readdir } = await import('node:fs/promises');
  let total = 0;
  const walk = async (p) => {
    let entries = [];
    try { entries = await readdir(p, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = `${p}/${e.name}`;
      if (e.isDirectory()) await walk(full);
      else { try { total += (await stat(full)).size; } catch {} }
    }
  };
  await walk(path);
  return total;
}

const before = await dirSize('.tmp').catch(() => 0);
await rm('.tmp', { recursive: true, force: true });
console.log(`removed .tmp (${(before / 1e6).toFixed(1)} MB freed)`);
