/** Shared 503 body when pairing storage env vars are missing on the deployment. */
export const PC_SCAN_NOT_CONFIGURED = {
  error: 'PC scan pairing is not configured on this deployment.',
  code: 'PC_SCAN_STORAGE_MISSING',
  setup:
    'Upstash is not linked to this deployment yet. Vercel → fitgirl-game-finder → Storage → your Redis → Settings → connect THIS project (check Production). Then Settings → Environment Variables: confirm UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_*), then Redeploy (not just rebuild). Manual: copy REST URL/token from console.upstash.com → add both vars for Production → redeploy. Check GET /api/pc-scan/health — storageEnvKeys should list UPSTASH_* or KV_*.',
};