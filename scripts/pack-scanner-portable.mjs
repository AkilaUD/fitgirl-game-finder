import { createWriteStream, existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ZipArchive } from 'archiver';

const root = process.cwd();
const srcDir = join(root, 'tools', 'pc-scanner-portable');
const outDir = join(root, 'public', 'downloads');
const zipPath = join(outDir, 'FitGirlPcScanner-portable.zip');

await mkdir(outDir, { recursive: true });

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

console.log(`Created ${zipPath}`);