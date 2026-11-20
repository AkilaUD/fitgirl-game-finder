import { createWriteStream, existsSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ZipArchive } from 'archiver';

const root = process.cwd();
const srcDir = join(root, 'tools', 'pc-scanner-portable');
const outDir = join(root, 'public', 'downloads');
const apiDataDir = join(root, 'api', '_data');
const zipName = 'FitGirlPcScanner-portable.zip';
const zipPath = join(outDir, zipName);
const apiZipPath = join(apiDataDir, zipName);

await mkdir(outDir, { recursive: true });
await mkdir(apiDataDir, { recursive: true });

if (!existsSync(join(srcDir, 'Scan.ps1'))) {
  console.error('Missing tools/pc-scanner-portable — cannot pack.');
  process.exit(1);
}

await new Promise((resolve, reject) => {
  const out = createWriteStream(zipPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  out.on('close', resolve);
  archive.on('error', reject);
  out.on('error', reject);

  archive.pipe(out);
  archive.directory(srcDir, false);
  archive.finalize();
});

await copyFile(zipPath, apiZipPath);
console.log(`Created ${zipPath} and ${apiZipPath}`);