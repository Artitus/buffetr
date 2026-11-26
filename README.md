# Buffetr

Public free **Bloomberg war-room** dashboard: Buffett Indicator hero plus correlated bubble/FUD satellites (M2/CPI, federal debt & interest, Case-Shiller/mortgage, BTC & BTC/gold, margin debt/CAPE, Fear & Greed, yield curve & credit spreads).

## Features

- **Buffett Indicator hero** — full-bleed Lightweight Charts terminal view
- **Satellite grid** — dense mono panels for macro / leverage / crypto / rates
- **Real ingest** — Vercel cron every 4h via FRED, CoinGecko, Alternative.me, metals.live, CAPE CSV
- **Alerts stubbed** — flux detection + tweet/RSS drafts; no live X posting
- **Hardened Supabase** — anon read-only RLS; service-role writes from cron

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Hero charts | TradingView Lightweight Charts |
| Satellite charts | Tremor 3.x |
| UI | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (Postgres) |
| Data | FRED, CoinGecko, Alternative.me, metals.live |
| Deploy | Vercel (cron) |

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

## Buffett Indicator bands

| Ratio | Interpretation |
|-------|----------------|
| &lt; 75% | Undervalued |
| 75–100% | Fair value |
| 100–140% | Overvalued |
| &gt; 140% | Extreme |

## License

MIT
