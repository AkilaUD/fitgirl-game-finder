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
        'PC scan pairing storage is missing. On Vercel: Project → Storage → add Upstash Redis (or Blob), connect to this project, redeploy. Locally: copy .env.example to .env and set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or BLOB_READ_WRITE_TOKEN).',
    );
  }
  return new Error(msg || `HTTP ${status}`);
}