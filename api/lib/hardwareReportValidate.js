export const HARDWARE_SCHEMA_VERSION = 1;
const MAX_REPORT_BYTES = 256 * 1024;

export function validateHardwareReport(raw) {
  let body;
  try {
    body = typeof raw === 'string' ? raw : JSON.stringify(raw);
  } catch {
    return { ok: false, error: 'Invalid JSON.' };
  }
  if (body.length > MAX_REPORT_BYTES) return { ok: false, error: 'Report exceeds maximum size.' };

  let data;
  try {
    data = typeof raw === 'object' && raw !== null ? raw : JSON.parse(body);
  } catch {
    return { ok: false, error: 'Malformed JSON.' };
  }

  if (!data || typeof data !== 'object') return { ok: false, error: 'Report must be an object.' };
  if (data.schemaVersion !== HARDWARE_SCHEMA_VERSION) {
    return { ok: false, error: `Unsupported schemaVersion (expected ${HARDWARE_SCHEMA_VERSION}).` };
  }
  if (data.scanSource !== 'browser' && data.scanSource !== 'desktop') {
    return { ok: false, error: 'scanSource must be browser or desktop.' };
  }
  if (typeof data.timestamp !== 'string' || !data.timestamp) {
    return { ok: false, error: 'timestamp is required (ISO-8601).' };
  }

  data.gpus = Array.isArray(data.gpus) ? data.gpus : [];
  data.drives = Array.isArray(data.drives) ? data.drives : [];
  data.volumes = Array.isArray(data.volumes) ? data.volumes : [];
  if (data.ram && !Array.isArray(data.ram.modules)) data.ram.modules = [];

  return { ok: true, report: data };
}