/**
 * Daily catalogue refresh: scrape FitGirl → map Steam app ids → fetch new reqs → images → build.
 * Used locally and in .github/workflows/refresh-games-data.yml
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

const STEAMDB_GZ =
  'https://github.com/leinstay/steamdb/releases/latest/download/steamdb.min.json.gz';
const GZ_PATH = '.tmp/steamdb.min.json.gz';

mkdirSync('.tmp', { recursive: true });

function run(label, cmd, args, env = {}) {
  console.error(`\n=== ${label} ===`);
  execFileSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

async function downloadSteamDb() {
  if (existsSync(GZ_PATH)) {
    console.error('steamdb dump already present — skip download');
    return;
  }
  console.error('Downloading steamdb.min.json.gz …');
  const res = await fetch(STEAMDB_GZ);
  if (!res.ok) throw new Error(`steamdb download HTTP ${res.status}`);
  await writeFile(GZ_PATH, Buffer.from(await res.arrayBuffer()));
}

await downloadSteamDb();

run('scrape-fitgirl', process.execPath, ['scripts/scrape-fitgirl.mjs']);
run('appid-map', process.execPath, ['scripts/appid-map.mjs']);

const steamLimit = process.env.STEAM_LIMIT || '120';
const gap = process.env.GAP || '650';
run('steam-requirements', process.execPath, ['scripts/steam-requirements.mjs'], {
  LIMIT: steamLimit,
  GAP: gap,
});

run('scrape-images', process.execPath, ['scripts/scrape-images.mjs']);
run('build-data', process.execPath, ['scripts/build-data.mjs']);

console.error('\nDone — data/games.json and public/data/ updated.');