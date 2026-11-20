import { gpuScore } from './specs';
import type { DetectedInfo, RigFieldProvenance, RigState } from './gameTypes';
import type { HardwareReport, HardwareReportVolume } from './hardwareReport';

export type { RigFieldProvenance };

function cleanCpu(name: string) {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\s*\(R\)|\s*\(TM\)/gi, '')
    .replace(/\s*CPU\s*@.*$/i, '')
    .trim();
}

function cleanGpu(name: string) {
  return String(name)
    .replace(/\s*\((?:r|tm)\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickGpu(report: HardwareReport): string | null {
  const gpus = (report.gpus || [])
    .map((g) => g.model)
    .filter((m): m is string => Boolean(m))
    .filter((g) => !/virtual|basic display|remote|mirror/i.test(g));
  if (!gpus.length) return null;
  gpus.sort((a, b) => (gpuScore(b) || 0) - (gpuScore(a) || 0));
  return cleanGpu(gpus[0]);
}

export function pickInstallVolume(volumes: HardwareReportVolume[] | undefined, preferMount?: string | null) {
  if (!volumes?.length) return null;
  const normalized = preferMount?.replace(/\\$/g, '').toUpperCase();
  if (normalized) {
    const found = volumes.find((v) => v.driveLetter?.toUpperCase().startsWith(normalized));
    if (found) return found;
  }
  const c = volumes.find((v) => /^C:/i.test(v.driveLetter || ''));
  return c || volumes[0];
}

function bytesToGb(bytes: number | null | undefined) {
  if (bytes == null || bytes <= 0) return null;
  return Math.round((bytes / 1e9) * 10) / 10;
}

export interface MapReportOptions {
  installMount?: string | null;
  scanSource?: DetectedInfo['source'];
}

export function mapReportToRig(
  report: HardwareReport,
  options: MapReportOptions = {},
): {
  rig: RigState;
  detected: DetectedInfo;
  provenance: RigFieldProvenance;
  volumes: HardwareReportVolume[];
} {
  const source = options.scanSource ?? (report.scanSource === 'desktop' ? 'desktop' : 'browser');
  const provenance: RigFieldProvenance = {};
  const volumes = report.volumes || [];

  const rig: RigState = {
    gpu: '',
    cpu: '',
    ram: null,
    freeGb: null,
    installMount: null,
  };

  const gpu = pickGpu(report);
  if (gpu) {
    rig.gpu = gpu;
    provenance.gpu = source === 'desktop' ? 'desktop' : 'browser';
  }

  const cpuModel = report.cpu?.model;
  if (cpuModel) {
    rig.cpu = cleanCpu(cpuModel);
    provenance.cpu = source === 'desktop' ? 'desktop' : 'browser';
  }

  const ramGb =
    report.ram?.totalGB ??
    (report.ram?.totalBytes != null ? Math.round((report.ram.totalBytes / 1e9) * 10) / 10 : null);
  if (ramGb != null) {
    rig.ram = Math.round(ramGb);
    provenance.ram = source === 'desktop' ? 'desktop' : 'browser';
  }

  const vol = pickInstallVolume(volumes, options.installMount);
  if (vol) {
    rig.installMount = vol.driveLetter?.replace(/\\$/g, '') ?? null;
    const free = bytesToGb(vol.freeBytes);
    if (free != null) {
      rig.freeGb = Math.round(free);
      provenance.freeGb = source === 'desktop' ? 'desktop' : 'browser';
      provenance.installMount = provenance.freeGb;
    }
  }

  const drives = volumes.map((v) => ({
    mount: (v.driveLetter || '?').replace(/\\$/g, ''),
    totalGb: bytesToGb(v.capacityBytes) ?? 0,
    freeGb: bytesToGb(v.freeBytes) ?? 0,
    label: v.label || '',
  }));

  const detected: DetectedInfo = {
    source,
    cpu: rig.cpu || null,
    ramGb: rig.ram,
    cores: report.cpu?.logicalProcessors ?? null,
    drives,
    gpus: (report.gpus || []).map((g) => g.model).filter(Boolean) as string[],
    provenance,
    reportSummary: {
      os: report.os?.name,
      physicalCores: report.cpu?.physicalCores,
      threads: report.cpu?.logicalProcessors,
    },
  };

  return { rig, detected, provenance, volumes };
}