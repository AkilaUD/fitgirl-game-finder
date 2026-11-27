# Visitor analytics

## Vercel Web Analytics (recommended)

The site uses [`@vercel/analytics`](https://vercel.com/docs/analytics) in `src/App.tsx`.

1. Deploy the latest build to Vercel.
2. Vercel dashboard → **fitgirl-game-finder** → **Analytics** → **Enable Web Analytics** (Hobby includes a monthly pageview allowance).
3. After traffic, open **Analytics** for visitors, page views, referrers, countries, and devices.

Counts are **private** (dashboard only). Local `npm run dev` does not contribute.

## Public footer counters

When **Upstash Redis** is linked (same as PC scan pairing), the footer shows:

- **Visits** — once per browser tab session (30-day dedupe)
- **PC pairings** — each successful “Generate pairing code”
- **Scanner saves** — installer via `/api/pc-scan/pair` GET or download click in the scan wizard (weekly dedupe per tab for static `/downloads/`)

`GET /api/stats` returns JSON for operators. If Redis is not configured, the footer counters stay hidden (Vercel Analytics still works separately).

## Other options

| Option | Good for |
|--------|----------|
| **Vercel Analytics** | Simple visitor/pageview counts, no cookie banner for basic mode |
| **Google Analytics 4** | Deep funnels; needs consent in some regions |
| **Plausible / Umami** | Self-hosted or SaaS, privacy-focused |
| **Custom Redis counter** | Public “X visits” badge — easy to game, duplicates on refresh |

Do not put a secret analytics token in the client bundle unless the provider is designed for public IDs (e.g. GA measurement ID).