import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = join(root, 'tools', 'pc-scanner-portable', 'Scan.ps1');
const stubPath = join(root, 'scripts', 'ScannerLauncher.cs');
const outDir = join(root, 'public', 'downloads');
const apiData = join(root, 'api', '_data');
const exeName = 'FitGirlPcScanner-setup.exe';
const outExe = join(outDir, exeName);

const ps1 = readFileSync(scriptPath);
const b64 = ps1.toString('base64');

let stub = readFileSync(stubPath, 'utf8');
stub = stub.replace('__SCRIPT_B64__', b64);

const genCs = join(root, 'scripts', '.ScannerLauncher.generated.cs');
writeFileSync(genCs, stub, 'utf8');

const csc = join(
  process.env.WINDIR || 'C:\\Windows',
  'Microsoft.NET',
  'Framework64',
  'v4.0.30319',
  'csc.exe',
);

mkdirSync(outDir, { recursive: true });
mkdirSync(apiData, { recursive: true });

execFileSync(csc, ['/nologo', '/target:exe', `/out:${outExe}`, genCs], { stdio: 'inherit' });
copyFileSync(outExe, join(apiData, exeName));
console.log(`Created ${outExe} (${readFileSync(outExe).length} bytes)`);