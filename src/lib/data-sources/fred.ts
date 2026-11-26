/**
 * FRED API Client
 * Federal Reserve Economic Data — free access to economic data
 * API Key: https://fred.stlouisfed.org/docs/api/api_key.html
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

export const FRED_SERIES = {
  BUFFETT_INDICATOR: "DDDM01USA156NWDB",
  GDP: "GDP",
  SP500: "SP500",
  VIX: "VIXCLS",
  MORTGAGE_30Y: "MORTGAGE30US",
  TREASURY_10Y: "DGS10",
  TREASURY_2Y: "DGS2",
  YIELD_CURVE_10Y2Y: "T10Y2Y",
  HOME_PRICE_INDEX: "CSUSHPINSA",
  CPI: "CPIAUCSL",
  UNEMPLOYMENT: "UNRATE",
  M2_REAL: "M2REAL",
  FEDERAL_DEBT: "GFDEBTN",
  FEDERAL_INTEREST: "A091RC1Q027SBEA",
  MARGIN_DEBT: "BOGZ1FL663067003Q",
  /** Moody's Baa corporate minus 10Y Treasury — credit stress proxy */
  CREDIT_SPREAD: "BAA10Y",
  /** London AM gold fix USD/oz — historical gold for BTC/gold */
  GOLD_USD: "GOLDAMGBD228NLBM",
} as const;

export async function fetchFredSeries(
  seriesId: string,
  startDate?: string,
  endDate?: string,
  limit: number = 10000
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
    sort_order: "asc",
    limit: limit.toString(),
  });

  if (startDate) params.append("observation_start", startDate);
  if (endDate) params.append("observation_end", endDate);

  try {
    const response = await fetch(
      `${FRED_API_BASE}/series/observations?${params}`,
      { next: { revalidate: 3600 } }
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
  Array<{ date: string; ratio: number }>
> {
  const data = await fetchFredSeries(FRED_SERIES.BUFFETT_INDICATOR);
  return data.map((d) => ({
    date: d.date,
    ratio: d.value,
  }));
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

export async function fetchVIX(): Promise<
  Array<{ date: string; value: number }>
> {
  return fetchFredSeries(FRED_SERIES.VIX);
}

export async function fetchM2Real(): Promise<
  Array<{ date: string; value: number }>
> {
  return fetchFredSeries(FRED_SERIES.M2_REAL);
}

export async function fetchFederalDebt(): Promise<
  Array<{ date: string; value: number }>
> {
  return fetchFredSeries(FRED_SERIES.FEDERAL_DEBT);
}

export async function fetchFederalInterest(): Promise<
  Array<{ date: string; value: number }>
> {
  return fetchFredSeries(FRED_SERIES.FEDERAL_INTEREST);
}

export async function fetchMarginDebt(): Promise<
  Array<{ date: string; value: number }>
> {
  return fetchFredSeries(FRED_SERIES.MARGIN_DEBT);
}

export async function fetchCreditSpread(): Promise<
  Array<{ date: string; value: number }>
> {
  return fetchFredSeries(FRED_SERIES.CREDIT_SPREAD);
}

export async function fetchYieldCurveSeries(): Promise<
  Array<{ date: string; value: number }>
> {
  return fetchFredSeries(FRED_SERIES.YIELD_CURVE_10Y2Y);
}

export async function fetchGoldUsd(): Promise<
  Array<{ date: string; value: number }>
> {
  return fetchFredSeries(FRED_SERIES.GOLD_USD);
}

export async function fetchYieldCurve(): Promise<
  Array<{ date: string; spread: number; t10y: number; t2y: number }>
> {
  const [t10yData, t2yData] = await Promise.all([
    fetchFredSeries(FRED_SERIES.TREASURY_10Y),
    fetchFredSeries(FRED_SERIES.TREASURY_2Y),
  ]);

  if (!t10yData.length || !t2yData.length) {
    return [];
  }

  const t2yMap = new Map<string, number>();
  t2yData.forEach((obs) => t2yMap.set(obs.date, obs.value));

  return t10yData
    .filter((obs) => t2yMap.has(obs.date))
    .map((obs) => ({
      date: obs.date,
      t10y: obs.value,
      t2y: t2yMap.get(obs.date)!,
      spread: obs.value - t2yMap.get(obs.date)!,
    }));
}

export async function fetchCPI(): Promise<
  Array<{ date: string; value: number; yoyChange?: number }>
> {
  const data = await fetchFredSeries(FRED_SERIES.CPI);

  return data.map((item) => {
    const itemDate = new Date(item.date);
    const yearAgo = data.find((d) => {
      const dDate = new Date(d.date);
      const monthDiff =
        (itemDate.getFullYear() - dDate.getFullYear()) * 12 +
        (itemDate.getMonth() - dDate.getMonth());
      return monthDiff >= 11 && monthDiff <= 13;
    });

    const yoyChange = yearAgo
      ? ((item.value - yearAgo.value) / yearAgo.value) * 100
      : undefined;

    return {
      date: item.date,
      value: item.value,
      yoyChange,
    };
  });
}

export async function fetchUnemployment(): Promise<
  Array<{ date: string; value: number }>
> {
  return fetchFredSeries(FRED_SERIES.UNEMPLOYMENT);
}
