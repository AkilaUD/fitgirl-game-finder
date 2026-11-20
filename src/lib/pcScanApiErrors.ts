export function pcScanHttpError(status: number, serverMessage?: string): Error {
  const msg = serverMessage?.trim();
  if (status === 404) {
    return new Error(
      msg ||
        'Pairing API not found. On local dev restart Vite (pairing runs in the dev server). On Vercel deploy the latest branch and set Upstash env vars.',
    );
  }
  if (status === 503) {
    return new Error(
      msg ||
        'PC scan pairing is not configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env (local) or Vercel project settings.',
    );
  }
  return new Error(msg || `HTTP ${status}`);
}