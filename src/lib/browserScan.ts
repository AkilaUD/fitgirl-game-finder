import { detectGpu, scanPc } from './specs';
import type { DetectedInfo } from './gameTypes';

function parseBrowserName(ua: string): { name: string | null; version: string | null } {
  const edge = ua.match(/\bEdg\/([\d.]+)/);
  if (edge) return { name: 'Edge', version: edge[1] };
  const chrome = ua.match(/\bChrome\/([\d.]+)/);
  if (chrome && !/Edg\//.test(ua)) return { name: 'Chrome', version: chrome[1] };
  const firefox = ua.match(/\bFirefox\/([\d.]+)/);
  if (firefox) return { name: 'Firefox', version: firefox[1] };
  const safari = ua.match(/\bVersion\/([\d.]+).*Safari/);
  if (safari && !chrome) return { name: 'Safari', version: safari[1] };
  return { name: null, version: null };
}

/** Browser-only hardware pass — never fabricates CPU model or physical disk free space. */
export async function runBrowserScan(): Promise<DetectedInfo> {
  const base = await scanPc();
  const { name, version } = parseBrowserName(navigator.userAgent);

  let quotaEstimateGb: number | null = null;
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      if (est.quota != null) quotaEstimateGb = Math.round((est.quota / 1e9) * 10) / 10;
    }
  } catch {
    /* ignore */
  }

  const conn = (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number } })
    .connection;

  return {
    source: 'browser',
    cores: base.cores,
    ram: base.ram,
    ramCapped: base.ramCapped,
    ramGb: base.ramCapped ? base.ram : base.ram,
    screen: base.screen,
    dpr: base.dpr,
    platform: base.platform,
    freeGb: null,
    browserName: name,
    browserVersion: version,
    quotaEstimateGb,
    connectionType: conn?.effectiveType ?? null,
    gpus: base.gpu ? [base.gpu] : [],
    provenance: {
      gpu: base.gpu ? 'browser' : 'unavailable',
      cpu: 'unavailable',
      ram: base.ram ? (base.ramCapped ? 'browser' : 'browser') : 'unavailable',
      freeGb: 'unavailable',
    },
  };
}

export async function browserScanGpuOnly() {
  return detectGpu();
}