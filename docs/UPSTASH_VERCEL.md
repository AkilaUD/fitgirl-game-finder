# Upstash + Vercel (all environments)

Pairing needs Redis env vars on **every** Vercel environment you use:

| Vercel scope | When it runs |
|--------------|----------------|
| **Production** | `fitgirl-game-finder.vercel.app` |
| **Preview** | PR / branch deploy URLs |
| **Development** | `vercel dev` (optional if you use `npm run dev` + `.env`) |

## Quick check

```http
GET https://fitgirl-game-finder.vercel.app/api/pc-scan/health
```

Success: `"ok": true`, `"kind": "redis"`.  
Failure: `"storageEnvKeys": []` → vars never reached that deploy.

---

## Step A — Link Storage to the project

1. [Vercel](https://vercel.com) → **fitgirl-game-finder**
2. **Storage** → your Upstash Redis DB (e.g. `fitgirl-pc-scan`)
3. **Settings** → **Connect to Project** → pick **fitgirl-game-finder**

The integration usually creates env vars automatically. If not, use Step B.

---

## Step B — Environment variables (check all three)

**Settings** → **Environment Variables**.

For **each** variable, enable **Production**, **Preview**, and **Development**:

| Variable | Required |
|----------|----------|
| `UPSTASH_REDIS_REST_URL` | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Yes |

(Or `KV_REST_API_URL` + `KV_REST_API_TOKEN` from the Upstash–Vercel marketplace.)

### Manual copy from Upstash

1. [console.upstash.com](https://console.upstash.com) → database → tab **REST API**
2. Copy URL + token
3. Vercel → **Add** each name, paste value, select **all three** environment boxes → Save

Optional (recommended for Preview deploys):

```env
ALLOWED_ORIGINS=https://fitgirl-game-finder.vercel.app,http://localhost:5173
```

Add each preview hostname if you restrict origins (leave unset to allow same-origin only).

---

## Step C — Redeploy each URL you use

Env changes do **not** affect live traffic until a **new deployment**:

1. **Deployments** → latest → **⋯** → **Redeploy** (Production)
2. Redeploy Preview branches if you test pairing there
3. After `vercel env pull`, run `vercel dev` if you use Vercel dev (Development env)

---

## Local development (`npm run dev`)

Not the same as Vercel’s “Development” scope — uses files on disk:

```bash
# Copy template
copy .env.example .env
# Edit .env with the same UPSTASH_* values as Vercel
npm run dev
```

Vite injects `.env` into the pairing middleware (`scripts/vitePcScanPlugin.mjs`).

Verify locally:

```bash
npm run env:check-pairing
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 503 on production, health `ok: false` | Vars missing for **Production** or no redeploy after adding |
| Works on main URL, fails on PR URL | Enable **Preview** on both Upstash vars; redeploy preview |
| Works on Vercel, fails on `npm run dev` | Add vars to root `.env`; restart Vite |
| Vars in dashboard but health empty | Wrong project linked in Storage, or typo in var names |

See also [HARDWARE_SCAN.md](HARDWARE_SCAN.md).