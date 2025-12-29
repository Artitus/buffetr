# Buffetr 📈

A beautiful financial dashboard for tracking the Warren Buffett Indicator, precious metals prices, housing market data, and key market metrics.

![Buffetr Dashboard](https://via.placeholder.com/800x400?text=Buffetr+Dashboard)

## Features

- **Warren Buffett Indicator** - Track the total market cap to GDP ratio with historical context
- **S&P 500 Index** - Monitor US stock market performance with 52-week range
- **Precious Metals** - Gold and silver prices with gold/silver ratio analysis
- **Housing Market** - 30-year mortgage rates and Case-Shiller Home Price Index
- **Dark Theme** - Beautiful, modern interface optimized for financial data

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Charts**: Tremor 3.x
- **UI Components**: shadcn/ui + Tailwind CSS v4
- **Database**: Supabase (Postgres)
- **Data Sources**: FRED API, metals.live
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)
- FRED API key (free at [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/buffetr.git
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
   ```
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

### Deployment to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
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
Triggered by Vercel Cron to update all metrics. Requires `CRON_SECRET` authorization.

## Data Sources

| Metric | Source | Update Frequency |
|--------|--------|------------------|
| Buffett Indicator | FRED (WILL5000PRFC, GDP) | Daily |
| Gold Price | metals.live | Every 4 hours |
| Silver Price | metals.live | Every 4 hours |
| S&P 500 | FRED | Daily |
| 30Y Mortgage Rate | FRED (MORTGAGE30US) | Weekly |
| Home Price Index | FRED (CSUSHPINSA) | Monthly |

## Understanding the Buffett Indicator

The Warren Buffett Indicator (Total Market Cap / GDP) is considered by many investors to be "the best single measure of where valuations stand at any given moment."

| Ratio | Interpretation |
|-------|----------------|
| < 50% | Severely Undervalued |
| 50-75% | Undervalued |
| 75-100% | Fair Value |
| 100-115% | Modestly Overvalued |
| 115-140% | Significantly Overvalued |
| > 140% | Severely Overvalued |

## License

MIT License - feel free to use this project however you'd like.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

Built with ❤️ using Next.js and Tremor
