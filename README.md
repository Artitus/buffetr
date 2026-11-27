# Buffetr

Buffett. Cheap, Fine, Hot, Cooked.

Buffett · BTC · Houses · Debt · Gold · Fear · Yield · Rates

| Word | Buffett |
|------|---------|
| CHEAP | below 75 |
| FINE | 75 up to 100 |
| HOT | 100 up to 140 |
| COOKED | 140 and over |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Charts | TradingView Lightweight Charts |
| Panels | Tremor 3.x |
| UI | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (Postgres) |
| Data | FRED, CoinGecko, Alternative.me, metals.live |
| Deploy | Vercel |

## Getting Started

1. `npm install`
2. `cp .env.example .env.local` and fill values
3. Run `supabase/schema.sql` in the Supabase SQL editor
4. `npm run dev` → [http://localhost:3000](http://localhost:3000)
5. Seed data: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/update-metrics`

Empty boards are intentional until cron + credentials succeed — no fake demo headlines.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key (read-only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role for cron writes |
| `FRED_API_KEY` | Yes | FRED API key |
| `CRON_SECRET` | Yes | Bearer secret for cron + alerts preview |
| `GOLD_API_KEY` | No | Optional metals fallback |
| `NEXT_PUBLIC_SITE_URL` | No | Used in alert draft links |

## API

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/metrics/[type]` | Public | Time series / `?latest=true` |
| `GET /api/cron/update-metrics` | `Bearer CRON_SECRET` | Full war-room ingest |
| `GET /api/alerts/preview` | `Bearer CRON_SECRET` | Flux drafts (stub) |
| `GET /api/alerts/rss` | Public | Valid empty RSS skeleton |

### Metric types

`buffett_indicator`, `gold`, `silver`, `sp500`, `mortgage_rate`, `home_price_index`, `market_cap`, `gdp`, `m2_real`, `cpi`, `federal_debt`, `federal_interest`, `bitcoin`, `btc_gold_ratio`, `margin_debt`, `cape`, `fear_greed`, `yield_curve`, `credit_spread`

## Buffett bands

| Ratio | Word |
|-------|------|
| below 75 | CHEAP |
| 75 up to 100 | FINE |
| 100 up to 140 | HOT |
| 140 and over | COOKED |

## License

MIT
