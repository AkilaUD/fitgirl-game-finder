import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const exePath = join(root, 'public', 'downloads', 'FitGirlPcScanner-setup.exe');
const tplPath = join(root, 'server', 'lib', 'scannerZip.template.js');
const outPath = join(root, 'server', 'lib', 'scannerZip.js');

const [exe, tpl] = await Promise.all([readFile(exePath), readFile(tplPath, 'utf8')]);
const b64 = exe.toString('base64');
if (!b64) {
  console.error('Empty installer — run: npm run scanner:build-exe (Windows)');
  process.exit(1);
}
await writeFile(outPath, tpl.replace('__SCANNER_EXE_B64__', b64), 'utf8');
console.log(`Wrote ${outPath} (${exe.length} bytes embedded)`);