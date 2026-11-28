/**
 * Keyless history longer than the public CoinGecko window.
 * CoinGecko's free market_chart refuses anything older than 365 days.
 */

export async function fetchBlockchainBitcoin(): Promise<
  Array<{ date: string; value: number }>
> {
  try {
    const response = await fetch(
      "https://api.blockchain.info/charts/market-price?timespan=all&format=json&sampled=false",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!response.ok) {
      throw new Error(`Blockchain charts error: ${response.status}`);
    }
    const data = (await response.json()) as {
      values?: Array<{ x?: number; y?: number }>;
    };
    return (data.values ?? []).flatMap((point) => {
      if (typeof point.x !== "number" || typeof point.y !== "number") return [];
      if (!Number.isFinite(point.y)) return [];
      return [
        {
          date: new Date(point.x * 1000).toISOString().slice(0, 10),
          value: point.y,
        },
      ];
    });
  } catch (error) {
    console.error("Error fetching Bitcoin market history:", error);
    return [];
  }
}

/** COMEX gold futures, daily. Spot proxies on CoinGecko only cover the last year. */
export async function fetchGoldFutures(): Promise<
  Array<{ date: string; value: number }>
> {
  try {
    const response = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?period1=0&period2=2000000000&interval=1d",
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "buffetr/1.0",
        },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!response.ok) {
      throw new Error(`Gold history error: ${response.status}`);
    }
    const data = (await response.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const points: Array<{ date: string; value: number }> = [];
    for (let i = 0; i < timestamps.length; i++) {
      const value = closes[i];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      points.push({
        date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
        value,
      });
    }
    return points;
  } catch (error) {
    console.error("Error fetching gold history:", error);
    return [];
  }
}
