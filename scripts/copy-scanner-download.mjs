// Copy the latest Tauri NSIS installer into public/downloads for same-origin direct download.
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'public', 'downloads');
const outFile = join(outDir, 'FitGirlPcScanner-setup.exe');
const bundleRoot = join(root, 'scanner', 'src-tauri', 'target', 'release', 'bundle');

async function walk(dir) {
  let hits = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return hits;
  }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) hits = hits.concat(await walk(p));
    else if (ent.isFile() && extname(ent.name).toLowerCase() === '.exe') hits.push(p);
  }
  return hits;
}

async function pickInstaller(paths) {
  const setup = paths.filter((p) => /setup\.exe$/i.test(p));
  const pool = setup.length ? setup : paths;
  let best = null;
  let bestSize = 0;
  for (const p of pool) {
    const s = await stat(p);
    if (s.size > bestSize) {
      bestSize = s.size;
      best = p;
    }
  }
  return best;
}

const candidates = await walk(bundleRoot);
const src = await pickInstaller(candidates);
if (!src) {
  console.error('No scanner .exe found. Run: cd scanner && npm run tauri build');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
await copyFile(src, outFile);
console.log(`Copied ${src} → ${outFile}`);