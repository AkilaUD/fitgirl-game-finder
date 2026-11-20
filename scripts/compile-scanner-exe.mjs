import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const winSrc = join(root, 'scripts', 'scanner-win');
const outDir = join(root, 'public', 'downloads');
const apiData = join(root, 'api', '_data');
const exeName = 'FitGirlPcScanner-setup.exe';
const outExe = join(outDir, exeName);
const manifest = join(winSrc, 'app.manifest');

const csc = join(
  process.env.WINDIR || 'C:\\Windows',
  'Microsoft.NET',
  'Framework64',
  'v4.0.30319',
  'csc.exe',
);

if (!existsSync(csc)) {
  console.error('csc.exe not found — build the scanner .exe on Windows with .NET Framework 4.x.');
  process.exit(1);
}

const sources = readdirSync(winSrc)
  .filter((f) => f.endsWith('.cs'))
  .map((f) => join(winSrc, f));

const refs = [
  'System.dll',
  'System.Windows.Forms.dll',
  'System.Drawing.dll',
  'System.Management.dll',
  'System.Web.Extensions.dll',
];

mkdirSync(outDir, { recursive: true });
mkdirSync(apiData, { recursive: true });

const args = [
  '/nologo',
  '/target:winexe',
  '/platform:anycpu',
  '/optimize+',
  `/win32manifest:${manifest}`,
  ...refs.map((r) => `/reference:${join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', r)}`),
  `/out:${outExe}`,
  ...sources,
];

execFileSync(csc, args, { stdio: 'inherit' });

const pfx = process.env.SCANNER_CODESIGN_PFX?.trim();
const pfxPass = process.env.SCANNER_CODESIGN_PASSWORD ?? '';
if (pfx && existsSync(pfx)) {
  const signtool = join(
    process.env.ProgramFiles(x86) || 'C:\\Program Files (x86)',
    'Windows Kits',
    '10',
    'bin',
    '10.0.22621.0',
    'x64',
    'signtool.exe',
  );
  if (existsSync(signtool)) {
    const signArgs = ['sign', '/fd', 'SHA256', '/tr', 'http://timestamp.digicert.com', '/td', 'SHA256', '/f', pfx];
    if (pfxPass) signArgs.push('/p', pfxPass);
    signArgs.push(outExe);
    execFileSync(signtool, signArgs, { stdio: 'inherit' });
    console.log('Signed', exeName);
  } else {
    console.warn('signtool not found — ship unsigned or set SCANNER_CODESIGN_PFX after installing Windows SDK');
  }
}

copyFileSync(outExe, join(apiData, exeName));
console.log(`Created ${outExe} (${statSync(outExe).size} bytes, WinForms GUI)`);