const PRIVATE_HOST =
  /^(localhost|(?:10|127)\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|\[::1\]|::1|[a-z0-9-]+\.local)$/i;

export function helperExpected() {
  const forced = new URLSearchParams(location.search).get('helper');
  if (forced === '1') return true;
  if (forced === '0') return false;
  return PRIVATE_HOST.test(location.hostname || '');
}

export async function readSystemInfo() {
  if (!helperExpected()) return null;
  try {
    const res = await fetch('/api/system', { cache: 'no-store', headers: { Accept: 'application/json' } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}