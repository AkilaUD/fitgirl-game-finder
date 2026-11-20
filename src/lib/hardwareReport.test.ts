import { describe, expect, it } from 'vitest';
import { validateHardwareReport } from './hardwareReport';

describe('validateHardwareReport', () => {
  it('accepts valid desktop report', () => {
    const r = validateHardwareReport({
      schemaVersion: 1,
      scanSource: 'desktop',
      timestamp: new Date().toISOString(),
      gpus: [],
    });
    expect(r.ok).toBe(true);
  });

  it('rejects bad schema version', () => {
    const r = validateHardwareReport({ schemaVersion: 2, scanSource: 'desktop', timestamp: 'x' });
    expect(r.ok).toBe(false);
  });
});