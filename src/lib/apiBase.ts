/** Browser calls use same-origin `/api/*` by default. Set VITE_PC_SCAN_API_BASE only for cross-origin dev. */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = import.meta.env.VITE_PC_SCAN_API_BASE?.trim().replace(/\/$/, '');
  return base ? `${base}${normalized}` : normalized;
}