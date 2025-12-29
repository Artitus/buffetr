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
  // Market Indicators
  WILSHIRE_5000: "WILL5000PRFC", // Total Market Cap (Price Index)
  GDP: "GDP", // Gross Domestic Product
  SP500: "SP500", // S&P 500 Index
  VIX: "VIXCLS", // CBOE Volatility Index
  
  // Interest Rates & Yields
  MORTGAGE_30Y: "MORTGAGE30US", // 30-Year Fixed Rate Mortgage
  TREASURY_10Y: "DGS10", // 10-Year Treasury Rate
  TREASURY_2Y: "DGS2", // 2-Year Treasury Rate
  
  // Housing
  HOME_PRICE_INDEX: "CSUSHPINSA", // Case-Shiller National Home Price Index
  
  // Economic Health
  CPI: "CPIAUCSL", // Consumer Price Index for All Urban Consumers
  UNEMPLOYMENT: "UNRATE", // Unemployment Rate
  
  // P/E Ratio (Shiller)
  PE_RATIO: "MULTPL/SHILLER_PE_RATIO_MONTH", // Not in FRED, need alternative
} as const;

export async function fetchFredSeries(
  seriesId: string,
  startDate?: string,
  endDate?: string,
  limit: number = 10000 // 10+ years of daily data
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
    sort_order: "asc", // Oldest first for proper charting
    limit: limit.toString(),
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
  const [marketCapData, gdpData] = await Promise.all([
    fetchFredSeries(FRED_SERIES.WILSHIRE_5000),
    fetchFredSeries(FRED_SERIES.GDP),
  ]);

  if (!marketCapData.length || !gdpData.length) {
    return [];
  }

  const gdpMap = new Map<string, number>();
  gdpData.forEach((obs) => {
    gdpMap.set(obs.date, obs.value);
  });

  const results: Array<{
    date: string;
    marketCap: number;
    gdp: number;
    ratio: number;
  }> = [];

  const gdpDates = Array.from(gdpMap.keys()).sort();

  for (const mcObs of marketCapData) {
    let nearestGdp: number | null = null;
    for (let i = gdpDates.length - 1; i >= 0; i--) {
      if (gdpDates[i] <= mcObs.date) {
        nearestGdp = gdpMap.get(gdpDates[i]) || null;
        break;
      }
    }

    if (nearestGdp && nearestGdp > 0) {
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

export async function fetchMortgageRate(): Promise<Array<{ date: string; value: number }>> {
  return fetchFredSeries(FRED_SERIES.MORTGAGE_30Y);
}

export async function fetchHomePriceIndex(): Promise<Array<{ date: string; value: number }>> {
  return fetchFredSeries(FRED_SERIES.HOME_PRICE_INDEX);
}

export async function fetchSP500(): Promise<Array<{ date: string; value: number }>> {
  return fetchFredSeries(FRED_SERIES.SP500);
}

// New indicators

export async function fetchVIX(): Promise<Array<{ date: string; value: number }>> {
  return fetchFredSeries(FRED_SERIES.VIX);
}

export async function fetchYieldCurve(): Promise<Array<{ date: string; spread: number; t10y: number; t2y: number }>> {
  const [t10yData, t2yData] = await Promise.all([
    fetchFredSeries(FRED_SERIES.TREASURY_10Y),
    fetchFredSeries(FRED_SERIES.TREASURY_2Y),
  ]);

  if (!t10yData.length || !t2yData.length) {
    return [];
  }

  // Create a map for 2Y yields
  const t2yMap = new Map<string, number>();
  t2yData.forEach((obs) => t2yMap.set(obs.date, obs.value));

  // Calculate spread for each date where we have both
  return t10yData
    .filter((obs) => t2yMap.has(obs.date))
    .map((obs) => ({
      date: obs.date,
      t10y: obs.value,
      t2y: t2yMap.get(obs.date)!,
      spread: obs.value - t2yMap.get(obs.date)!,
    }));
}

export async function fetchCPI(): Promise<Array<{ date: string; value: number; yoyChange?: number }>> {
  const data = await fetchFredSeries(FRED_SERIES.CPI, undefined, undefined, 24); // 2 years for YoY
  
  // Calculate year-over-year change
  return data.map((item, index) => {
    const yearAgoIndex = data.findIndex((d) => {
      const itemDate = new Date(item.date);
      const dDate = new Date(d.date);
      const monthDiff = (itemDate.getFullYear() - dDate.getFullYear()) * 12 + (itemDate.getMonth() - dDate.getMonth());
      return monthDiff >= 11 && monthDiff <= 13;
    });
    
    const yoyChange = yearAgoIndex !== -1 
      ? ((item.value - data[yearAgoIndex].value) / data[yearAgoIndex].value) * 100
      : undefined;
    
    return {
      date: item.date,
      value: item.value,
      yoyChange,
    };
  });
}

export async function fetchUnemployment(): Promise<Array<{ date: string; value: number }>> {
  return fetchFredSeries(FRED_SERIES.UNEMPLOYMENT);
}
