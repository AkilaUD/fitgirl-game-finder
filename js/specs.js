/* PC spec detection + hardware requirement matching.
   GPU performance numbers are a relative index (RTX 4090 = 100) used only to compare
   "your card" against the card named in a game's requirements. They are estimates. */

const GPU_TABLE = {
  // NVIDIA RTX 50
  'rtx 5090': 130, 'rtx 5080': 96, 'rtx 5070 ti': 84, 'rtx 5070': 66, 'rtx 5060 ti': 52, 'rtx 5060': 42,
  // RTX 40
  'rtx 4090': 100, 'rtx 4080 super': 88, 'rtx 4080': 85, 'rtx 4070 ti super': 79, 'rtx 4070 ti': 72,
  'rtx 4070 super': 68, 'rtx 4070': 58, 'rtx 4060 ti': 44, 'rtx 4060': 35,
  // RTX 30
  'rtx 3090 ti': 77, 'rtx 3090': 73, 'rtx 3080 ti': 71, 'rtx 3080': 65, 'rtx 3070 ti': 54, 'rtx 3070': 49,
  'rtx 3060 ti': 44, 'rtx 3060': 32, 'rtx 3050': 21,
  // RTX 20
  'rtx 2080 ti': 52, 'rtx 2080 super': 46, 'rtx 2080': 43, 'rtx 2070 super': 40, 'rtx 2070': 36,
  'rtx 2060 super': 32, 'rtx 2060': 27,
  // GTX 16 / 10
  'gtx 1660 ti': 24, 'gtx 1660 super': 23, 'gtx 1660': 21, 'gtx 1650 super': 16, 'gtx 1650': 13,
  'gtx 1630': 11, 'gtx 1080 ti': 36, 'gtx 1080': 29, 'gtx 1070 ti': 28, 'gtx 1070': 25,
  'gtx 1060 6gb': 17, 'gtx 1060 3gb': 13, 'gtx 1060': 15, 'gtx 1050 ti': 9, 'gtx 1050': 7.5, 'gt 1030': 4,
  // GTX 9 / 7 / 6
  'gtx 980 ti': 24, 'gtx 980': 19, 'gtx 970': 17, 'gtx 960': 11, 'gtx 950': 8,
  'gtx 750 ti': 6, 'gtx 750': 5, 'gtx 745': 3, 'gtx 760': 6.5, 'gtx 680': 6, 'gtx 670': 5,
  'gtx 660 ti': 5, 'gtx 660': 4.5, 'gtx 650 ti': 3, 'gtx 650': 2.5, 'gtx 560 ti': 2, 'gtx 560': 1.8,
  'gtx 550 ti': 1.5, 'gtx 480': 2, 'gtx 470': 1.8, 'gt 730': 1.4, 'gt 710': 1,
  // AMD RX 9000
  'rx 9070 xt': 78, 'rx 9070': 68, 'rx 9060 xt': 42,
  // RX 7000
  'rx 7900 xtx': 92, 'rx 7900 xt': 83, 'rx 7900 gre': 68, 'rx 7800 xt': 62, 'rx 7700 xt': 52,
  'rx 7600 xt': 36, 'rx 7600': 32,
  // RX 6000
  'rx 6950 xt': 62, 'rx 6900 xt': 60, 'rx 6800 xt': 58, 'rx 6800': 52, 'rx 6750 xt': 43,
  'rx 6700 xt': 40, 'rx 6700': 38, 'rx 6650 xt': 30, 'rx 6600 xt': 28, 'rx 6600': 24,
  'rx 6500 xt': 14, 'rx 6400': 10,
  // RX 5000 / Vega / older
  'rx 5700 xt': 31, 'rx 5700': 28, 'rx 5600 xt': 24, 'rx 5500 xt': 17,
  'vega 64': 22, 'vega 56': 20, 'r9 fury': 14, 'r9 390': 12, 'r9 290': 12, 'r9 380': 8, 'r9 280': 8,
  'rx 580': 17, 'rx 570': 14, 'rx 560': 10, 'rx 550': 6, 'rx 480': 16, 'rx 470': 13, 'rx 460': 8,
  'hd 7970': 9, 'hd 7950': 8, 'hd 7870': 6, 'hd 7850': 5.5, 'hd 7770': 3.5,
  'hd 6970': 5, 'hd 6950': 4.5, 'hd 6870': 3.5, 'hd 6850': 3, 'hd 6770': 2, 'hd 5770': 2,
  // AMD integrated
  '780m': 12, '760m': 9, '680m': 8, '660m': 6, 'vega 8': 5, 'vega 7': 4.5, 'vega 6': 4, 'vega 3': 3,
  // Intel
  'arc b580': 40, 'arc b570': 32, 'arc a770': 30, 'arc a750': 26, 'arc a580': 20, 'arc a380': 14,
  'iris xe max': 8, 'iris xe': 6, 'iris plus': 4, 'uhd 770': 3, 'uhd 730': 2.2, 'uhd 630': 2,
  'uhd 620': 1.8, 'hd 630': 1.8, 'hd 620': 1.6, 'hd 530': 1.4, 'hd 520': 1.3,
  'hd 4600': 1.2, 'hd 4400': 1.1, 'hd 4000': 1, 'hd 3000': 0.5,
};

const GPU_KEYS = Object.keys(GPU_TABLE).sort((a, b) => b.length - a.length);

export function normalizeGpu(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\((r|tm|tm)\)/g, ' ')
    .replace(/\b(graphics|geforce|nvidia|amd|intel|angle|direct3d\d*|d3d\d*|vs_\d+_\d+|ps_\d+_\d+|opengl|engine|pci|express|corp|inc)\b/g, ' ')
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Distinct families for models the table cannot name exactly (integrated chips, unmapped cards).
const GPU_FALLBACKS = [
  [/\bapple m4\b/, 32], [/\bapple m3\b/, 28], [/\bapple m2\b/, 24], [/\bapple m1\b/, 20],
  [/\biris xe max\b/, 8], [/\biris\b/, 6], [/\barc\b/, 20],
  [/\buhd\b/, 2], [/\bhd\b/, 1.5], [/\bvega\b/, 4.5],
  [/\brtx\b/, 30], [/\bgtx\b/, 10], [/\brx\b/, 15], [/\bradeon\b/, 4],
];

export function gpuScore(name) {
  if (!name) return null;
  const raw = String(name).toLowerCase();
  const n = normalizeGpu(name);
  let best = null, bestLen = 0;
  for (const key of GPU_KEYS) {
    if (n.includes(key) && key.length > bestLen) { best = GPU_TABLE[key]; bestLen = key.length; }
  }
  if (best == null) {
    for (const [re, v] of GPU_FALLBACKS) if (re.test(n)) { best = v; break; }
  }
  if (best == null) return null;
  // Laptop/mobile parts of the same name are slower than the desktop card.
  if (/\b(laptop|mobile|max-q)\b/.test(raw)) best *= 0.87;
  return Math.round(best * 10) / 10;
}

// GPU fields name several acceptable cards ("GTX 1060 or RX 580"); the weakest one is the bar.
export function reqGpuScore(text) {
  if (!text) return null;
  const parts = String(text).split(/\bor\b|\/|,|;|&/i);
  const scores = parts.map((p) => gpuScore(p)).filter((s) => s != null);
  return scores.length ? Math.min(...scores) : null;
}

export function ramGb(text) {
  if (!text) return null;
  const m = String(text).match(/(\d+(?:[.,]\d+)?)\s*GB/i);
  if (m) return Number(m[1].replace(',', '.'));
  const mb = String(text).match(/(\d{3,4})\s*MB/i);
  return mb ? Math.round(Number(mb[1]) / 1024 * 10) / 10 : null;
}

export function storageGb(text) {
  if (!text) return null;
  const gb = String(text).match(/(\d+(?:[.,]\d+)?)\s*(?:GB|GiB)/i);
  if (gb) return Number(gb[1].replace(',', '.'));
  const mb = String(text).match(/(\d{3,5})\s*(?:MB|MiB)/i);
  return mb ? Math.round(Number(mb[1]) / 1024 * 10) / 10 : null;
}

// Rough CPU index: family weight + launch generation + model number, on one scale for Intel and AMD.
export function cpuScore(name) {
  if (!name) return null;
  const n = String(name).toLowerCase().replace(/\s+/g, ' ');
  const tier = { '3': 6, '5': 10, '7': 14, '9': 18 };
  let m = n.match(/ryzen\s*(3|5|7|9)\s*(?:ai\s*)?(\d)\d{3}/);
  if (m) {
    const series = Number(m[2]);
    const year = { 1: 2017, 2: 2018, 3: 2019, 5: 2020, 6: 2020, 7: 2022, 8: 2024, 9: 2025 }[series] || 2020;
    return tier[m[1]] + (year - 2010) + 0.6;
  }
  m = n.match(/core\s*ultra\s*(5|7|9)/);
  if (m) return tier[m[1]] + 15 + 0.7;
  m = n.match(/(?:core\s*)?i(3|5|7|9)[- ](\d{4,5})/);
  if (m) {
    const num = m[2];
    // 2500 -> gen 2, 8400 -> gen 8, 10400 -> gen 10, 12700 -> gen 12
    const gen = num.length === 5 ? Number(num.slice(0, 2)) : Number(num.slice(0, 1));
    const year = gen <= 3 ? 2010 + gen : 2012 + gen;
    return tier[m[1]] + (year - 2010) + 0.5;
  }
  if (/xeon/.test(n)) return 18;
  m = n.match(/fx[- ]?(\d{4})/);
  if (m) return 6 + Number(m[1]) / 1000;
  if (/(pentium|celyon|celeron|athlon|sempron)/.test(n)) return 5;
  if (/(apple m\d (pro|max|ultra)?)/.test(n)) return 26;
  return null;
}

export function reqCpuScore(text) {
  if (!text) return null;
  const parts = String(text).split(/\bor\b|\/|,|;|&/i);
  const scores = parts.map((p) => cpuScore(p)).filter((s) => s != null);
  return scores.length ? Math.min(...scores) : null;
}

/* ---------- PC scan ---------- */

// Browser GPU strings look like "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)".
export function cleanGpuName(raw) {
  let s = String(raw || '');
  const angle = s.match(/^ANGLE\s*\((.*)\)$/i);
  if (angle) {
    let inner = angle[1].split(/\bDirect3D\d*\b|\bD3D\d*\b|\bOpenGL\b|\bVulkan\b/i)[0];
    const parts = inner.split(',').map((p) => p.trim()).filter(Boolean);
    const model = parts.find((p) => !/^(intel|nvidia|amd|ati|microsoft|google|apple)$/i.test(p)) || parts[0] || inner;
    s = model;
  }
  return s
    .replace(/\(0x[0-9a-f]+\)/gi, '')
    .replace(/\((r|tm)\)/gi, '')
    .replace(/\b(vs|ps)_\d+_\d+\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function detectGpu() {
  // WebGPU exposes a readable adapter description in Chromium browsers.
  try {
    if (navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      const info = adapter && (adapter.info || (adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : null));
      if (info && (info.description || info.device)) {
        const raw = info.description || info.device;
        return { name: cleanGpuName(raw), raw, source: 'WebGPU', vendor: info.vendor || '' };
      }
    }
  } catch {}
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
      const loss = gl.getExtension('WEBGL_lose_context');
      if (loss) loss.loseContext();
      if (renderer) return { name: cleanGpuName(String(renderer)), raw: String(renderer), source: 'WebGL', vendor: String(vendor || '') };
    }
  } catch {}
  return null;
}

export async function scanPc() {
  const gpu = await detectGpu();
  let freeGb = null;
  try {
    const est = await navigator.storage.estimate();
    if (est && est.quota) freeGb = Math.round(((est.quota - (est.usage || 0)) / 1e9) * 10) / 10;
  } catch {}
  const mem = navigator.deviceMemory || null;
  return {
    gpu: gpu ? gpu.name : '',
    gpuSource: gpu ? gpu.source : '',
    cores: navigator.hardwareConcurrency || null,
    ram: mem,
    ramCapped: mem === 8,
    screen: `${screen.width}x${screen.height}`,
    dpr: window.devicePixelRatio || 1,
    freeGb,
    platform: navigator.userAgentData?.platform || navigator.platform || '',
    touch: navigator.maxTouchPoints > 0,
  };
}

/* ---------- requirement evaluation ---------- */

const cmp = (have, need, tolerance = 0.95) => {
  if (have == null || need == null) return 'unknown';
  return have >= need * tolerance ? 'pass' : 'fail';
};

export function evaluate(game, pc) {
  const min = game.steam && game.steam.min ? game.steam.min : null;
  const rec = game.steam && game.steam.rec ? game.steam.rec : null;
  if (!min && !rec) return { verdict: 'nodata', gpu: null, ram: null, cpu: null, storage: null };

  const need = (r) => ({
    gpu: r.gpu ? reqGpuScore(r.gpu) : null,
    ram: r.ram ? ramGb(r.ram) : null,
    cpu: r.cpu ? reqCpuScore(r.cpu) : null,
    storage: r.storage ? storageGb(r.storage) : null,
  });

  const minN = min ? need(min) : null;
  const recN = rec ? need(rec) : null;
  const target = minN || recN;

  const checks = {
    gpu: cmp(pc.gpuScore, target.gpu),
    ram: cmp(pc.ram, target.ram, 1),
    cpu: cmp(pc.cpuScore, target.cpu),
    storage: pc.freeGb != null && target.storage != null ? (pc.freeGb >= target.storage ? 'pass' : 'fail') : 'unknown',
  };

  const hardFail = checks.gpu === 'fail' || checks.ram === 'fail' || checks.cpu === 'fail' || checks.storage === 'fail';
  let verdict = 'unknown';
  if (hardFail) verdict = 'below';
  else {
    const recChecks = recN ? [cmp(pc.gpuScore, recN.gpu), cmp(pc.ram, recN.ram, 1), cmp(pc.cpuScore, recN.cpu)] : [];
    const failsRec = recChecks.includes('fail');
    const passesMin = [cmp(pc.gpuScore, minN?.gpu), cmp(pc.ram, minN?.ram, 1), cmp(pc.cpuScore, minN?.cpu)]
      .filter((s) => s !== 'unknown');
    if (failsRec) verdict = 'min';
    else if (passesMin.length && passesMin.every((s) => s === 'pass')) verdict = recN ? 'rec' : 'min';
    else verdict = 'unknown';
  }
  return { verdict, min: minN, rec: recN, checks, target };
}
