import type { PcProfile, ReqBlock } from './specs';

export type { PcProfile };

export interface SteamSpecs {
  appid?: number;
  min?: ReqBlock;
  rec?: ReqBlock;
}

export interface Game {
  id: number;
  title: string;
  url: string;
  date?: string;
  sizeGb?: number;
  origGb?: number;
  tags?: string[];
  companies?: string;
  languages?: string;
  img?: string;
  steam?: SteamSpecs | null;
  _v?: Record<string, ReturnType<typeof import('./specs').evaluate>>;
}

export interface GameFacets {
  yearMin: number;
  yearMax: number;
  maxSize: number;
  genres: { tag: string; count: number }[];
}

export type CompatFilter = 'any' | 'min' | 'rec';
export type SortKey = 'new' | 'small' | 'large' | 'fit';

export interface FilterState {
  q: string;
  sizeMin: number;
  sizeMax: number;
  yearMin: number;
  yearMax: number;
  genres: Set<string>;
  compat: CompatFilter;
  sort: SortKey;
  limit: number;
}

export type FieldSource = 'desktop' | 'browser' | 'manual' | 'unavailable';

export interface RigFieldProvenance {
  gpu?: FieldSource;
  cpu?: FieldSource;
  ram?: FieldSource;
  freeGb?: FieldSource;
  installMount?: FieldSource;
}

export interface DetectedInfo {
  source?: 'local-server' | 'browser' | 'dxdiag' | 'desktop';
  cpu?: string | null;
  cores?: number | null;
  ramGb?: number | null;
  ram?: number | null;
  ramCapped?: boolean;
  drives?: { mount: string; freeGb: number; totalGb?: number; label?: string }[];
  gpus?: string[];
  screen?: string;
  dpr?: number;
  platform?: string;
  freeGb?: number | null;
  browserName?: string | null;
  browserVersion?: string | null;
  quotaEstimateGb?: number | null;
  connectionType?: string | null;
  provenance?: RigFieldProvenance;
  reportSummary?: {
    os?: string | null;
    physicalCores?: number | null;
    threads?: number | null;
  };
}

export interface RigState {
  gpu: string;
  cpu: string;
  ram: number | null;
  freeGb: number | null;
  /** Drive letter used for storage compatibility (e.g. C:). */
  installMount?: string | null;
}

export interface Suggestions {
  gpus: string[];
  cpus: string[];
}