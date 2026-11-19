// Turns Steam's HTML requirement blobs into { os, cpu, ram, gpu, dx, storage, notes }.
export const REQ_FIELDS = {
  os: 'os',
  processor: 'cpu',
  cpu: 'cpu',
  memory: 'ram',
  graphics: 'gpu',
  'video card': 'gpu',
  directx: 'dx',
  storage: 'storage',
  'hard disk space': 'storage',
  'hard drive': 'storage',
  'sound card': 'sound',
  'additional notes': 'notes',
  network: 'network',
  internet: 'network',
};

export function parseReq(html) {
  if (!html || typeof html !== 'string' || html.length < 10) return null;
  const text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<(ul|ol)[^>]*>/gi, '\n')
    .replace(/<\/(ul|ol|p|h1|h2|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z][A-Za-z /]{1,24}?)\s*(?:\*)?\s*:\s*(.+)$/);
    if (!m) continue;
    const key = REQ_FIELDS[m[1].toLowerCase().trim()];
    const value = m[2].replace(/\s*[®™]\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (key && value && !out[key]) out[key] = value.slice(0, 300);
  }
  return Object.keys(out).length ? out : null;
}
