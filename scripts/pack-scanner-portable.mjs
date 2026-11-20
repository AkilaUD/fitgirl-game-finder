import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const srcDir = join(root, 'tools', 'pc-scanner-portable');
const outDir = join(root, 'public', 'downloads');
const zipPath = join(outDir, 'FitGirlPcScanner-portable.zip');

const ps = `
$src = ${JSON.stringify(srcDir)}
$dest = ${JSON.stringify(zipPath)}
if (Test-Path $dest) { Remove-Item -Force $dest }
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
Compress-Archive -Path (Join-Path $src '*') -DestinationPath $dest -Force
Write-Output $dest
`;

await mkdir(outDir, { recursive: true });
await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true });
console.log(`Created ${zipPath}`);