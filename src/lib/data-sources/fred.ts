/**
 * FRED API Client
 * Federal Reserve Economic Data - free access to economic data
 * API Key required: https://fred.stlouisfed.org/docs/api/api_key.html
 */

const FRED_API_BASE = "https://api.stlouisfed.org/fred";

interface FredObservation {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
}

interface FredSeriesResponse {
  observations: FredObservation[];
}

// FRED Series IDs
export const FRED_SERIES = {
  WILSHIRE_5000: "WILL5000PRFC", // Total Market Cap (Price Index)
  GDP: "GDP", // Gross Domestic Product
  MORTGAGE_30Y: "MORTGAGE30US", // 30-Year Fixed Rate Mortgage
  HOME_PRICE_INDEX: "CSUSHPINSA", // Case-Shiller National Home Price Index
  SP500: "SP500", // S&P 500 Index
} as const;

export async function fetchFredSeries(
  seriesId: string,
  startDate?: string,
  endDate?: string
): Promise<Array<{ date: string; value: number }>> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.error("FRED_API_KEY not configured");
    return [];
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    sort_order: "desc",
    limit: "365",
  });

  if (startDate) params.append("observation_start", startDate);
  if (endDate) params.append("observation_end", endDate);

  try {
    const response = await fetch(
      `${FRED_API_BASE}/series/observations?${params}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }

    const data: FredSeriesResponse = await response.json();

    return data.observations
      .filter((obs) => obs.value !== ".")
      .map((obs) => ({
        date: obs.date,
        value: parseFloat(obs.value),
      }));
  } catch (error) {
    console.error(`Error fetching FRED series ${seriesId}:`, error);
    return [];
  }
}

export async function fetchBuffettIndicatorData(): Promise<
  Array<{ date: string; marketCap: number; gdp: number; ratio: number }>
> {
  // Fetch both series
  const [marketCapData, gdpData] = await Promise.all([
    fetchFredSeries(FRED_SERIES.WILSHIRE_5000),
    fetchFredSeries(FRED_SERIES.GDP),
  ]);

  if (!marketCapData.length || !gdpData.length) {
    return [];
  }

  // Create a map of GDP values by quarter (GDP is quarterly)
  const gdpMap = new Map<string, number>();
  gdpData.forEach((obs) => {
    // Store GDP for the quarter
    gdpMap.set(obs.date, obs.value);
  });

  // For each market cap observation, find the nearest GDP value
  // and calculate the Buffett Indicator
  const results: Array<{
    date: string;
    marketCap: number;
    gdp: number;
    ratio: number;
  }> = [];

  // Get sorted GDP dates for finding nearest
  const gdpDates = Array.from(gdpMap.keys()).sort();

  for (const mcObs of marketCapData) {
    // Find the most recent GDP value before this date
    let nearestGdp: number | null = null;
    for (let i = gdpDates.length - 1; i >= 0; i--) {
      if (gdpDates[i] <= mcObs.date) {
        nearestGdp = gdpMap.get(gdpDates[i]) || null;
        break;
      }
    }

    if (nearestGdp && nearestGdp > 0) {
      // Wilshire 5000 is in billions, GDP is also in billions
      // The ratio is typically expressed as a percentage
      // Market Cap / GDP * 100
      const ratio = (mcObs.value / nearestGdp) * 100;

      results.push({
        date: mcObs.date,
        marketCap: mcObs.value,
        gdp: nearestGdp,
        ratio,
      });
    }
  }

  return results;
}

export async function fetchMortgageRate(): Promise<
  Array<{ date: string; value: number }>
> {
  return fetchFredSeries(FRED_SERIES.MORTGAGE_30Y);
}

export async function fetchHomePriceIndex(): Promise<
  Array<{ date: string; value: number }>
> {
  return fetchFredSeries(FRED_SERIES.HOME_PRICE_INDEX);
}

export async function fetchSP500(): Promise<
  Array<{ date: string; value: number }>
> {
  return fetchFredSeries(FRED_SERIES.SP500);
}

