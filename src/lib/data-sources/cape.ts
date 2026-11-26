/**
 * Shiller CAPE (PE10) from the public datahub S&P 500 dataset.
 * PE10 may lag recent months; values of 0 are filtered out.
 */

const CAPE_CSV_URL =
  "https://raw.githubusercontent.com/datasets/s-and-p-500/master/data/data.csv";

export async function fetchCapeHistory(): Promise<
  Array<{ date: string; value: number }>
> {
  try {
    const response = await fetch(CAPE_CSV_URL, {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error(`CAPE CSV error: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.trim().split("\n").slice(1);
    const points: Array<{ date: string; value: number }> = [];

    for (const line of lines) {
      const cols = line.split(",");
      if (cols.length < 10) continue;
      const date = cols[0]?.trim();
      const pe10 = parseFloat(cols[9]);
      if (!date || !Number.isFinite(pe10) || pe10 <= 0) continue;
      points.push({ date, value: pe10 });
    }

    return points;
  } catch (error) {
    console.error("Error fetching CAPE history:", error);
    return [];
  }
}
