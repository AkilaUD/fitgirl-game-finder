export function pcScanHttpError(status: number, serverMessage?: string): Error {
  const msg = serverMessage?.trim();
  if (status === 404) {
    return new Error(
      msg ||
        'Pairing API not found (404). Local: restart `npm run dev` and try again. Vercel: redeploy latest `main` with `vercel.json` routing `/api/*` to the app service, then check GET /api/pc-scan/health.',
    );
  }
  if (status === 503) {
    return new Error(
      msg ||
        'PC scan pairing storage is missing. Vercel: add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (Production, Preview, Development), then redeploy — docs/UPSTASH_VERCEL.md. Local: .env with the same vars, npm run dev.',
    );
  }
  return new Error(msg || `HTTP ${status}`);
}