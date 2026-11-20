# Build a single self-extracting FitGirlPcScanner-setup.exe (IExpress — built into Windows).
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$srcDir = Join-Path $root 'tools\pc-scanner-portable'
$outDir = Join-Path $root 'public\downloads'
$apiData = Join-Path $root 'api\_data'
$exeName = 'FitGirlPcScanner-setup.exe'
$work = Join-Path $env:TEMP 'FitGirlPcScannerIExpress'
$build = Join-Path $work 'payload'
$targetExe = Join-Path $work $exeName
$finalExe = Join-Path $outDir $exeName

if (-not (Test-Path $srcDir)) {
  Write-Error "Missing $srcDir"
}

Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $build, $outDir, $apiData | Out-Null
Copy-Item -Path (Join-Path $srcDir '*') -Destination $build -Force

$sedPath = Join-Path $work 'scanner.sed'

$sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=1
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=Return to your browser to finish pairing.
TargetName=%TARGET%
FriendlyName=FitGirl PC Scanner
AppLaunched=%PROGRAM%
PostInstallCmd=
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[Strings]
TARGET=$targetExe
PROGRAM=Run-Scanner.cmd
FILE0=Scan.ps1
FILE1=Run-Scanner.cmd
FILE2=README.txt
[SourceFiles]
SourceFiles0=$build
[SourceFiles0]
%FILE0%
%FILE1%
%FILE2%
"@

Set-Content -Path $sedPath -Value $sed -Encoding ASCII
$iexpress = Join-Path $env:SystemRoot 'System32\iexpress.exe'
if (-not (Test-Path $iexpress)) {
  Write-Error 'iexpress.exe not found (Windows only).'
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $iexpress
$psi.Arguments = "/N /Q `"$sedPath`""
$psi.UseShellExecute = $false
$p = [System.Diagnostics.Process]::Start($psi)
$p.WaitForExit()
if ($p.ExitCode -ne 0 -or -not (Test-Path $targetExe)) {
  Write-Error "IExpress failed (exit $($p.ExitCode))."
}

Copy-Item -Force $targetExe $finalExe
Copy-Item -Force $targetExe (Join-Path $apiData $exeName)
Write-Host "Created $finalExe ($((Get-Item $finalExe).Length) bytes)"