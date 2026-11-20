/** Hardware report schema v1 — no serials, MACs, or product keys. */

export const HARDWARE_SCHEMA_VERSION = 1 as const;

export type ScanSource = 'browser' | 'desktop';

export interface HardwareReportCpu {
  manufacturer: string | null;
  model: string | null;
  architecture: string | null;
  physicalCores: number | null;
  logicalProcessors: number | null;
  maxClockMhz: number | null;
  currentClockMhz: number | null;
}

export interface HardwareReportRamModule {
  capacityBytes: number | null;
  manufacturer: string | null;
  speedMhz: number | null;
  memoryType: string | null;
}

export interface HardwareReportRam {
  totalBytes: number | null;
  totalGB: number | null;
  modules: HardwareReportRamModule[];
}

export interface HardwareReportGpu {
  manufacturer: string | null;
  model: string | null;
  driverVersion: string | null;
  dedicatedVramBytes: number | null;
  sharedVramBytes: number | null;
}

export interface HardwareReportPhysicalDrive {
  model: string | null;
  manufacturer: string | null;
  capacityBytes: number | null;
  mediaType: 'SSD' | 'HDD' | 'NVMe' | 'Unknown' | null;
  interfaceType: string | null;
}

export interface HardwareReportVolume {
  driveLetter: string | null;
  label: string | null;
  capacityBytes: number | null;
  freeBytes: number | null;
  usedBytes: number | null;
  fileSystem: string | null;
}

export interface HardwareReportOs {
  name: string | null;
  version: string | null;
  build: string | null;
  architecture: string | null;
}

export interface HardwareReportSystem {
  manufacturer: string | null;
  model: string | null;
}

export interface HardwareReportMotherboard {
  manufacturer: string | null;
  product: string | null;
  biosManufacturer: string | null;
  biosVersion: string | null;
}

export interface HardwareReport {
  schemaVersion: typeof HARDWARE_SCHEMA_VERSION;
  scanSource: ScanSource;
  timestamp: string;
  system?: HardwareReportSystem | null;
  cpu?: HardwareReportCpu | null;
  ram?: HardwareReportRam | null;
  gpus?: HardwareReportGpu[];
  drives?: HardwareReportPhysicalDrive[];
  volumes?: HardwareReportVolume[];
  os?: HardwareReportOs | null;
  motherboard?: HardwareReportMotherboard | null;
  monitoring?: {
    cpuUtilizationPercent: number | null;
    gpuUtilizationPercent: number | null;
    cpuTemperatureC: number | null;
    gpuTemperatureC: number | null;
  } | null;
}

const MAX_REPORT_BYTES = 256 * 1024;

export function validateHardwareReport(raw: unknown): { ok: true; report: HardwareReport } | { ok: false; error: string } {
  let body: string;
  try {
    body = typeof raw === 'string' ? raw : JSON.stringify(raw);
  } catch {
    return { ok: false, error: 'Invalid JSON.' };
  }
  if (body.length > MAX_REPORT_BYTES) return { ok: false, error: 'Report exceeds maximum size.' };

  let data: unknown;
  try {
    data = typeof raw === 'object' && raw !== null ? raw : JSON.parse(body);
  } catch {
    return { ok: false, error: 'Malformed JSON.' };
  }

  if (!data || typeof data !== 'object') return { ok: false, error: 'Report must be an object.' };
  const r = data as Record<string, unknown>;
  if (r.schemaVersion !== HARDWARE_SCHEMA_VERSION) {
    return { ok: false, error: `Unsupported schemaVersion (expected ${HARDWARE_SCHEMA_VERSION}).` };
  }
  if (r.scanSource !== 'browser' && r.scanSource !== 'desktop') {
    return { ok: false, error: 'scanSource must be browser or desktop.' };
  }
  if (typeof r.timestamp !== 'string' || !r.timestamp) {
    return { ok: false, error: 'timestamp is required (ISO-8601).' };
  }

  const report = r as unknown as HardwareReport;
  report.gpus = Array.isArray(report.gpus) ? report.gpus : [];
  report.drives = Array.isArray(report.drives) ? report.drives : [];
  report.volumes = Array.isArray(report.volumes) ? report.volumes : [];
  if (report.ram && !Array.isArray(report.ram.modules)) report.ram.modules = [];

  return { ok: true, report };
}