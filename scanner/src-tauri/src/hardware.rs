use serde_json::Value;
use std::process::Command;

const PS_SCRIPT: &str = r#"
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
$ramModules = @($modules | ForEach-Object {
  @{
    capacityBytes = $_.Capacity
    manufacturer = $_.Manufacturer
    speedMhz = $_.Speed
    memoryType = $null
  }
})

$gpuArr = @($gpus | ForEach-Object {
  @{
    manufacturer = $_.AdapterCompatibility
    model = $_.Name
    driverVersion = $_.DriverVersion
    dedicatedVramBytes = $_.AdapterRAM
    sharedVramBytes = $null
  }
})

$driveArr = @($disks | ForEach-Object {
  @{
    model = $_.Model
    manufacturer = $_.Manufacturer
    capacityBytes = $_.Size
    mediaType = $null
    interfaceType = $_.InterfaceType
  }
})

$volArr = @($vols | ForEach-Object {
  @{
    driveLetter = $_.DeviceID
    label = $_.VolumeName
    capacityBytes = $_.Size
    freeBytes = $_.FreeSpace
    usedBytes = if ($_.Size -and $_.FreeSpace) { $_.Size - $_.FreeSpace } else { $null }
    fileSystem = $_.FileSystem
  }
})

@{
  schemaVersion = 1
  scanSource = 'desktop'
  timestamp = (Get-Date).ToUniversalTime().ToString('o')
  system = @{
    manufacturer = $cs.Manufacturer
    model = $cs.Model
  }
  cpu = @{
    manufacturer = $cpu.Manufacturer
    model = $cpu.Name
    architecture = $cpu.Architecture
    physicalCores = $cpu.NumberOfCores
    logicalProcessors = $cpu.NumberOfLogicalProcessors
    maxClockMhz = $cpu.MaxClockSpeed
    currentClockMhz = $cpu.CurrentClockSpeed
  }
  ram = @{
    totalBytes = $ramBytes
    totalGB = ToGb $ramBytes
    modules = $ramModules
  }
  gpus = $gpuArr
  drives = $driveArr
  volumes = $volArr
  os = @{
    name = $os.Caption
    version = $os.Version
    build = $os.BuildNumber
    architecture = $os.OSArchitecture
  }
  motherboard = @{
    manufacturer = $board.Manufacturer
    product = $board.Product
    biosManufacturer = $bios.Manufacturer
    biosVersion = $bios.SMBIOSBIOSVersion
  }
} | ConvertTo-Json -Compress -Depth 6
"#;

pub fn collect_report_json() -> Result<String, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            PS_SCRIPT,
        ])
        .output()
        .map_err(|e| format!("Failed to run PowerShell: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Hardware collection failed: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
  let _: Value = serde_json::from_str(&stdout).map_err(|e| format!("Invalid JSON from collector: {e}"))?;
    Ok(stdout)
}
