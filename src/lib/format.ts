export const fmtGb = (n: number | null | undefined) => {
  if (n == null) return '—';
  if (n < 1) return `${Math.round(n * 1024)} MB`;
  return n >= 10 ? `${Math.round(n)} GB` : `${n.toFixed(1)} GB`;
};

export const fmtDate = (iso: string | undefined) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export const pctSaved = (g: { origGb?: number; sizeGb?: number }) =>
  g.origGb && g.sizeGb ? Math.round((1 - g.sizeGb / g.origGb) * 100) : null;

export const esc = (s: string | null | undefined) =>
  String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));