/** User-safe 503 body when pairing storage env vars are missing on the deployment. */
export const PC_SCAN_NOT_CONFIGURED = {
  error: 'PC scan pairing is not available right now. Try again later, or enter your specs manually.',
  code: 'PC_SCAN_STORAGE_MISSING',
};

/** Operator / logs only — never attach to JSON shown to browsers. */
export const PC_SCAN_NOT_CONFIGURED_OPS =
  'Pairing storage not configured: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_* / BLOB_READ_WRITE_TOKEN) on the deployment and redeploy. See docs/UPSTASH_VERCEL.md and GET /api/pc-scan/health.';