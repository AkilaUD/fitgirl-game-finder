/** Shared 503 body when pairing storage env vars are missing on the deployment. */
export const PC_SCAN_NOT_CONFIGURED = {
  error: 'PC scan pairing is not configured on this deployment.',
  code: 'PC_SCAN_STORAGE_MISSING',
  setup:
    'Add Upstash to this deploy: Vercel → fitgirl-game-finder → Settings → Environment Variables → UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_*) with Production, Preview, and Development all enabled → Redeploy. Local: copy same values to .env and npm run dev. See docs/UPSTASH_VERCEL.md · GET /api/pc-scan/health',
};