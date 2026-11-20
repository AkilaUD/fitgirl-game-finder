# FitGirl PC Scanner (portable) — WMI hardware report + pairing upload
$ErrorActionPreference = 'Stop'

$defaultApi = 'https://fitgirl-game-finder.vercel.app'
$apiBase = ($args | Select-Object -First 1)
if (-not $apiBase) {
  $apiBase = Read-Host "API base URL [$defaultApi]"
}
if ([string]::IsNullOrWhiteSpace($apiBase)) { $apiBase = $defaultApi }
$apiBase = $apiBase.Trim().TrimEnd('/')

$code = Read-Host 'Enter the 6-character pairing code from the website'
$code = ($code -replace '\s', '').ToUpper()
if ($code -notmatch '^[A-Z0-9]{6}$') {
  Write-Host 'Invalid pairing code.' -ForegroundColor Red
  exit 1
}

Write-Host 'Collecting hardware (WMI)…'
$collect = @'
$ErrorActionPreference = 'SilentlyContinue'
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$cs = Get-CimInstance Win32_ComputerSystem
$os = Get-CimInstance Win32_OperatingSystem
$board = Get-CimInstance Win32_BaseBoard
$bios = Get-CimInstance Win32_BIOS
$gpus = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -and $_.Name -notmatch 'virtual|basic display|remote|mirror' }
$modules = Get-CimInstance Win32_PhysicalMemory
$disks = Get-CimInstance Win32_DiskDrive
$vols = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"
function ToGb($n) { if ($null -eq $n) { return $null }; [math]::Round($n / 1GB, 1) }
$ramBytes = ($modules | Measure-Object -Property Capacity -Sum).Sum
$ramModules = @($modules | ForEach-Object { @{ capacityBytes = $_.Capacity; manufacturer = $_.Manufacturer; speedMhz = $_.Speed; memoryType = $null } })
$gpuArr = @($gpus | ForEach-Object { @{ manufacturer = $_.AdapterCompatibility; model = $_.Name; driverVersion = $_.DriverVersion; dedicatedVramBytes = $_.AdapterRAM; sharedVramBytes = $null } })
$driveArr = @($disks | ForEach-Object { @{ model = $_.Model; manufacturer = $_.Manufacturer; capacityBytes = $_.Size; mediaType = $null; interfaceType = $_.InterfaceType } })
$volArr = @($vols | ForEach-Object { @{ driveLetter = $_.DeviceID; label = $_.VolumeName; capacityBytes = $_.Size; freeBytes = $_.FreeSpace; usedBytes = if ($_.Size -and $_.FreeSpace) { $_.Size - $_.FreeSpace } else { $null }; fileSystem = $_.FileSystem } })
@{
  schemaVersion = 1
  scanSource = 'desktop'
  timestamp = (Get-Date).ToUniversalTime().ToString('o')
  system = @{ manufacturer = $cs.Manufacturer; model = $cs.Model }
  cpu = @{ manufacturer = $cpu.Manufacturer; model = $cpu.Name; architecture = $cpu.Architecture; physicalCores = $cpu.NumberOfCores; logicalProcessors = $cpu.NumberOfLogicalProcessors; maxClockMhz = $cpu.MaxClockSpeed; currentClockMhz = $cpu.CurrentClockSpeed }
  ram = @{ totalBytes = $ramBytes; totalGB = ToGb $ramBytes; modules = $ramModules }
  gpus = $gpuArr
  drives = $driveArr
  volumes = $volArr
  os = @{ name = $os.Caption; version = $os.Version; build = $os.BuildNumber; architecture = $os.OSArchitecture }
  motherboard = @{ manufacturer = $board.Manufacturer; product = $board.Product; biosManufacturer = $bios.Manufacturer; biosVersion = $bios.SMBIOSBIOSVersion }
} | ConvertTo-Json -Compress -Depth 6
'@

$reportJson = powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command $collect
if (-not $reportJson) {
  Write-Host 'Hardware collection failed.' -ForegroundColor Red
  exit 1
}

$report = $reportJson | ConvertFrom-Json
$gpuName = ($report.gpus | Select-Object -First 1).model
$cpuName = $report.cpu.model
Write-Host ""
Write-Host "CPU: $cpuName"
Write-Host "GPU: $gpuName"
Write-Host "RAM: $($report.ram.totalGB) GB"
Write-Host ""
$confirm = Read-Host 'Upload this report to the website? (y/N)'
if ($confirm -notmatch '^[yY]') { exit 0 }

$body = @{ pairingCode = $code; report = $report } | ConvertTo-Json -Compress -Depth 8
$url = "$apiBase/api/pc-scan/complete"

try {
  $response = Invoke-WebRequest -Uri $url -Method POST -ContentType 'application/json; charset=utf-8' -Body $body -UseBasicParsing
  Write-Host 'Upload complete. Return to the browser tab — it should apply your hardware automatically.' -ForegroundColor Green
  exit 0
} catch {
  $msg = $_.Exception.Message
  if ($_.Exception.Response) {
    try {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $raw = $reader.ReadToEnd()
      $parsed = $raw | ConvertFrom-Json
      if ($parsed.error) { $msg = $parsed.error }
    } catch { }
  }
  Write-Host "Upload failed: $msg" -ForegroundColor Red
  exit 1
}