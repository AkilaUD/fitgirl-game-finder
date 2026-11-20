import type { DetectedInfo, RigState } from './gameTypes';
import type { RigFieldProvenance } from './gameTypes';

export const RIG_STORAGE_KEY = 'rf.rig.v3';
const LEGACY_KEY = 'rf.rig.v2';

export interface SavedRigProfile {
  gpu: string;
  cpu: string;
  ram: number | null;
  freeGb: number | null;
  installMount?: string | null;
  detected?: DetectedInfo | null;
  provenance?: RigFieldProvenance;
}

export function defaultRigState(): RigState {
  return { gpu: '', cpu: '', ram: null, freeGb: null, installMount: null };
}

export function loadRigProfile(): { rig: RigState; detected: DetectedInfo | null } {
  try {
    const v3 = localStorage.getItem(RIG_STORAGE_KEY);
    if (v3) {
      const saved = JSON.parse(v3) as SavedRigProfile;
      if (saved && (saved.gpu || saved.cpu || saved.ram)) {
        return {
          rig: {
            gpu: saved.gpu || '',
            cpu: saved.cpu || '',
            ram: saved.ram ?? null,
            freeGb: saved.freeGb ?? null,
            installMount: saved.installMount ?? null,
          },
          detected: saved.detected ?? null,
        };
      }
    }
    const v2 = localStorage.getItem(LEGACY_KEY);
    if (v2) {
      const saved = JSON.parse(v2) as SavedRigProfile;
      if (saved && (saved.gpu || saved.cpu || saved.ram)) {
        const rig = {
          gpu: saved.gpu || '',
          cpu: saved.cpu || '',
          ram: saved.ram ?? null,
          freeGb: saved.freeGb ?? null,
          installMount: null as string | null,
        };
        saveRigProfile(rig, saved.detected ?? null);
        localStorage.removeItem(LEGACY_KEY);
        return { rig, detected: saved.detected ?? null };
      }
    }
  } catch {
    /* ignore */
  }
  return { rig: defaultRigState(), detected: null };
}

export function saveRigProfile(rig: RigState, detected: DetectedInfo | null) {
  try {
    const payload: SavedRigProfile = {
      gpu: rig.gpu,
      cpu: rig.cpu,
      ram: rig.ram,
      freeGb: rig.freeGb,
      installMount: rig.installMount,
      detected,
      provenance: detected?.provenance,
    };
    localStorage.setItem(RIG_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function clearRigProfile() {
  localStorage.removeItem(RIG_STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEY);
}