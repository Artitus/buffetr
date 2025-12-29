/**
 * Cryptocurrency API Client
 * Using CoinGecko API (free, no key required for basic usage)
 */

const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";

interface CoinGeckoPrice {
  bitcoin: {
    usd: number;
    usd_24h_change: number;
  };
}

interface CoinGeckoMarketData {
  prices: [number, number][]; // [timestamp, price]
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export async function fetchBitcoinPrice(): Promise<{
  price: number;
  change24h: number;
  timestamp: Date;
} | null> {
  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoPrice = await response.json();

    return {
      price: data.bitcoin.usd,
      change24h: data.bitcoin.usd_24h_change,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Error fetching Bitcoin price:", error);
    return null;
  }
}

export async function fetchBitcoinHistory(
  days: number = 30
): Promise<Array<{ date: string; value: number }>> {
  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoMarketData = await response.json();

    return data.prices.map(([timestamp, price]) => ({
      date: new Date(timestamp).toISOString().split("T")[0],
      value: price,
    }));
  } catch (error) {
    console.error("Error fetching Bitcoin history:", error);
    return [];
  }
}

// Mock data for when API is rate-limited
export function getMockBitcoinData(): {
  price: number;
  change24h: number;
  history: Array<{ date: string; value: number }>;
} {
  const basePrice = 95000;
  return {
    price: basePrice + Math.random() * 5000,
    change24h: Math.random() * 10 - 5,
    history: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      value: basePrice + Math.random() * 10000 - 5000,
    })).reverse(),
  };
}

