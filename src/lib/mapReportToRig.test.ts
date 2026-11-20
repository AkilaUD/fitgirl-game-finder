import { describe, expect, it } from 'vitest';
import { mapReportToRig, pickInstallVolume } from './mapReportToRig';
import type { HardwareReport } from './hardwareReport';

const desktopSample: HardwareReport = {
  schemaVersion: 1,
  scanSource: 'desktop',
  timestamp: '2026-01-01T00:00:00.000Z',
  cpu: { manufacturer: 'AMD', model: 'AMD Ryzen 5 5600X', architecture: 'x64', physicalCores: 6, logicalProcessors: 12, maxClockMhz: 3700, currentClockMhz: null },
  ram: { totalBytes: 16e9, totalGB: 16, modules: [] },
  gpus: [
    { manufacturer: 'NVIDIA', model: 'NVIDIA GeForce RTX 3060', driverVersion: '551.0', dedicatedVramBytes: null, sharedVramBytes: null },
    { manufacturer: 'Microsoft', model: 'Microsoft Basic Display Adapter', driverVersion: null, dedicatedVramBytes: null, sharedVramBytes: null },
  ],
  volumes: [
    { driveLetter: 'C:', label: 'System', capacityBytes: 500e9, freeBytes: 200e9, usedBytes: 300e9, fileSystem: 'NTFS' },
    { driveLetter: 'D:', label: 'Games', capacityBytes: 1e12, freeBytes: 400e9, usedBytes: 600e9, fileSystem: 'NTFS' },
  ],
};

describe('mapReportToRig', () => {
  it('picks discrete GPU and maps CPU/RAM', () => {
    const { rig, detected } = mapReportToRig(desktopSample);
    expect(rig.gpu).toContain('RTX 3060');
    expect(rig.cpu).toContain('Ryzen 5 5600');
    expect(rig.ram).toBe(16);
    expect(detected.source).toBe('desktop');
  });

  it('uses install mount for free space', () => {
    const { rig } = mapReportToRig(desktopSample, { installMount: 'D:' });
    expect(rig.installMount).toBe('D:');
    expect(rig.freeGb).toBe(400);
  });

  it('pickInstallVolume prefers C:', () => {
    const vol = pickInstallVolume(desktopSample.volumes);
    expect(vol?.driveLetter).toBe('C:');
  });
});