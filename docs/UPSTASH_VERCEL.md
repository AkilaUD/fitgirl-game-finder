# Upstash + Vercel checklist (pairing 503)

When the site shows **PC scan pairing is not configured**, the API is running but **no Redis env vars** reach serverless.

## 1. Confirm on production

```text
GET https://fitgirl-game-finder.vercel.app/api/pc-scan/health
```

You need:

```json
{ "ok": true, "kind": "redis", ... }
```

If `"ok": false` and `"storageEnvKeys": []`, Vercel never injected credentials into this deploy.

## 2. Link database to this project

1. [Vercel Dashboard](https://vercel.com) → project **fitgirl-game-finder**
2. **Storage** → your Upstash Redis database
3. **Settings** → **Connect Project** / **Connected Projects**
4. Select **fitgirl-game-finder**
5. Enable **Production** (and Preview if you use preview URLs)

## 3. Environment variables

**Settings** → **Environment Variables**. You should see (from the integration):

| Name | Environments |
|------|----------------|
| `UPSTASH_REDIS_REST_URL` | Production (+ Preview) |
| `UPSTASH_REDIS_REST_TOKEN` | Production (+ Preview) |

Some integrations use `KV_REST_API_URL` / `KV_REST_API_TOKEN` instead — both work.

### Manual fallback

1. [Upstash Console](https://console.upstash.com) → your database → **REST API**
2. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**
3. Vercel → **Environment Variables** → add both manually → **Production**
4. **Deployments** → … on latest → **Redeploy**

## 4. Redeploy

Env changes apply only after a **new deployment**. Trigger **Redeploy** on the Production deployment.

## 5. Local dev

Copy the same two vars into `.env` at the repo root (see `.env.example`). Restart `npm run dev`.