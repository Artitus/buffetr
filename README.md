# Buffetr 📈

A beautiful financial dashboard for tracking the Warren Buffett Indicator, precious metals prices, housing market data, and key market metrics.

## Features

- **Warren Buffett Indicator** - Track the total market cap to GDP ratio with historical context and valuation levels
- **S&P 500 Index** - Monitor US stock market performance with 52-week range visualization
- **Precious Metals** - Gold and silver prices with gold/silver ratio analysis
- **Housing Market** - 30-year mortgage rates and Case-Shiller Home Price Index
- **Dark Theme** - Beautiful, modern interface optimized for financial data visualization
- **Demo Mode** - Works with mock data when database isn't configured
- **Automated Updates** - Vercel cron job fetches fresh data every 4 hours

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Charts | Tremor 3.x |
| UI Components | shadcn/ui + Tailwind CSS v4 |
| Database | Supabase (Postgres) |
| Data Sources | FRED API, metals.live |
| Deployment | Vercel |

## Project Structure

```
buffetr/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cron/update-metrics/    # Vercel cron endpoint
│   │   │   └── metrics/[type]/         # REST API for metrics
│   │   ├── globals.css                 # Custom dark theme
│   │   ├── layout.tsx                  # Root layout
│   │   └── page.tsx                    # Main dashboard
│   ├── components/
│   │   ├── charts/                     # Tremor chart components
│   │   │   ├── BuffettIndicatorChart.tsx
│   │   │   ├── PreciousMetalsChart.tsx
│   │   │   ├── HousingChart.tsx
│   │   │   └── SP500Chart.tsx
│   │   └── ui/                         # shadcn/ui components
│   └── lib/
│       ├── data-sources/               # API clients
│       │   ├── fred.ts                 # FRED API client
│       │   └── metals.ts               # Precious metals API
│       └── supabase.ts                 # Database client
├── supabase/schema.sql                 # Database schema
└── vercel.json                         # Cron configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)
- FRED API key (free at [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Artitus/buffetr.git
   cd buffetr
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   FRED_API_KEY=your-fred-api-key
   CRON_SECRET=your-random-secret
   ```

4. Set up the database:
   - Go to your Supabase project
   - Open the SQL Editor
   - Run the contents of `supabase/schema.sql`

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

> **Note:** The app works in demo mode with mock data if Supabase isn't configured yet!

### Deployment to Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `FRED_API_KEY`
   - `CRON_SECRET`
4. Deploy!

The cron job in `vercel.json` will automatically update data every 4 hours.

## API Routes

### GET /api/metrics/[type]
Fetch historical data for a specific metric.

**Parameters:**
- `type`: One of `buffett_indicator`, `gold`, `silver`, `sp500`, `mortgage_rate`, `home_price_index`, `market_cap`, `gdp`
- `latest` (optional): Set to `true` to get only the latest value
- `limit` (optional): Number of records to return (default: 365, max: 1000)

**Example:**
```bash
curl https://your-domain.com/api/metrics/buffett_indicator?limit=30
```

### GET /api/cron/update-metrics
Triggered by Vercel Cron to update all metrics. Requires `CRON_SECRET` authorization header.

## Data Sources

| Metric | Source | FRED Series | Update Frequency |
|--------|--------|-------------|------------------|
| Buffett Indicator | FRED | WILL5000PRFC / GDP | Daily |
| Gold Price | metals.live | - | Every 4 hours |
| Silver Price | metals.live | - | Every 4 hours |
| S&P 500 | FRED | SP500 | Daily |
| 30Y Mortgage Rate | FRED | MORTGAGE30US | Weekly |
| Home Price Index | FRED | CSUSHPINSA | Monthly |

## Understanding the Buffett Indicator

The Warren Buffett Indicator (Total Market Cap / GDP) is considered by many investors to be "the best single measure of where valuations stand at any given moment."

| Ratio | Interpretation | Color |
|-------|----------------|-------|
| < 50% | Severely Undervalued | 🟢 Green |
| 50-75% | Undervalued | 🟢 Green |
| 75-100% | Fair Value | 🟡 Yellow |
| 100-115% | Modestly Overvalued | 🟠 Orange |
| 115-140% | Significantly Overvalued | 🔴 Red |
| > 140% | Severely Overvalued | 🔴 Rose |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `FRED_API_KEY` | Yes | Federal Reserve Economic Data API key |
| `CRON_SECRET` | Yes | Secret for authenticating cron requests |
| `GOLD_API_KEY` | No | Optional Gold-API.io key (fallback for metals) |

## License

MIT License - feel free to use this project however you'd like.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

Built with ❤️ using Next.js, Tremor, and Supabase
