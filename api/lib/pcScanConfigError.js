/** Shared 503 body when pairing storage env vars are missing on the deployment. */
export const PC_SCAN_NOT_CONFIGURED = {
  error: 'PC scan pairing is not configured on this deployment.',
  code: 'PC_SCAN_STORAGE_MISSING',
  setup:
    'In Vercel → Project → Storage, add Upstash Redis (or Blob), connect it to this project, redeploy. Variables: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or KV_REST_API_* / BLOB_READ_WRITE_TOKEN.',
};