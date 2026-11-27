import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
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

function findSignTool() {
  const kitsRoot = join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Windows Kits', '10', 'bin');
  if (!existsSync(kitsRoot)) return null;
  const versions = readdirSync(kitsRoot).filter((d) => /^\d/.test(d)).sort().reverse();
  for (const ver of versions) {
    const p = join(kitsRoot, ver, 'x64', 'signtool.exe');
    if (existsSync(p)) return p;
  }
  return null;
}

function resolvePfx() {
  if (process.env.SCANNER_CODESIGN_PFX?.trim()) {
    return process.env.SCANNER_CODESIGN_PFX.trim();
  }
  const desktop = join(homedir(), 'Desktop', 'Certificate.pfx');
  if (existsSync(desktop)) return desktop;
  return null;
}

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

const fw = join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319');
const args = [
  '/nologo',
  '/target:winexe',
  '/platform:anycpu',
  '/optimize+',
  `/win32manifest:${manifest}`,
  ...refs.map((r) => `/reference:${join(fw, r)}`),
  `/out:${outExe}`,
  ...sources,
];

execFileSync(csc, args, { stdio: 'inherit' });

const pfx = resolvePfx();
const pfxPass = process.env.SCANNER_CODESIGN_PASSWORD ?? '';
const signtool = findSignTool();

if (pfx && existsSync(pfx)) {
  if (!signtool) {
    console.warn('Certificate found but signtool missing — install Windows SDK (Signing Tools for Windows).');
  } else if (!pfxPass) {
    console.warn(
      `Found ${pfx} but SCANNER_CODESIGN_PASSWORD is empty. Set it in .env (see .env.example) and rebuild to satisfy SmartScreen.`,
    );
  } else {
    const signArgs = [
      'sign',
      '/fd',
      'SHA256',
      '/tr',
      'http://timestamp.digicert.com',
      '/td',
      'SHA256',
      '/f',
      pfx,
      '/p',
      pfxPass,
      outExe,
    ];
    execFileSync(signtool, signArgs, { stdio: 'inherit' });
    console.log('Authenticode signed:', exeName);
  }
} else {
  console.warn('No signing certificate — SmartScreen may warn. Set SCANNER_CODESIGN_PFX or place Certificate.pfx on Desktop.');
}

copyFileSync(outExe, join(apiData, exeName));
console.log(`Created ${outExe} (${statSync(outExe).size} bytes)`);