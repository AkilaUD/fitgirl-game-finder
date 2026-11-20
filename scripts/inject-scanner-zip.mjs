import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const zipPath = join(root, 'api', '_data', 'FitGirlPcScanner-portable.zip');
const tplPath = join(root, 'api', 'lib', 'scannerZip.template.js');
const outPath = join(root, 'api', 'lib', 'scannerZip.js');

const [zip, tpl] = await Promise.all([readFile(zipPath), readFile(tplPath, 'utf8')]);
const b64 = zip.toString('base64');
if (!b64) {
  console.error('Empty zip — run npm run scanner:pack-portable first.');
  process.exit(1);
}
await writeFile(outPath, tpl.replace('__SCANNER_ZIP_B64__', b64), 'utf8');
console.log(`Wrote ${outPath} (${zip.length} bytes embedded)`);