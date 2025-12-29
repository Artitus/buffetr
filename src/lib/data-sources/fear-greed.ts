/**
 * Fear & Greed Index API Client
 * Using Alternative.me API (free, no key required)
 */

const FEAR_GREED_API = "https://api.alternative.me/fng/";

interface FearGreedData {
  name: string;
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
    time_until_update?: string;
  }>;
}

export type FearGreedClassification =
  | "Extreme Fear"
  | "Fear"
  | "Neutral"
  | "Greed"
  | "Extreme Greed";

export interface FearGreedValue {
  value: number;
  classification: FearGreedClassification;
  date: string;
}

export async function fetchFearGreedIndex(
  limit: number = 30
): Promise<FearGreedValue[]> {
  try {
    const response = await fetch(`${FEAR_GREED_API}?limit=${limit}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Fear & Greed API error: ${response.status}`);
    }

    const data: FearGreedData = await response.json();

    return data.data.map((item) => ({
      value: parseInt(item.value, 10),
      classification: item.value_classification as FearGreedClassification,
      date: new Date(parseInt(item.timestamp, 10) * 1000).toISOString().split("T")[0],
    }));
  } catch (error) {
    console.error("Error fetching Fear & Greed Index:", error);
    return [];
  }
}

export function getFearGreedColor(value: number): string {
  if (value <= 25) return "red"; // Extreme Fear
  if (value <= 45) return "orange"; // Fear
  if (value <= 55) return "yellow"; // Neutral
  if (value <= 75) return "lime"; // Greed
  return "emerald"; // Extreme Greed
}

export function getFearGreedEmoji(value: number): string {
  if (value <= 25) return "😱"; // Extreme Fear
  if (value <= 45) return "😰"; // Fear
  if (value <= 55) return "😐"; // Neutral
  if (value <= 75) return "😊"; // Greed
  return "🤑"; // Extreme Greed
}

// Mock data for development
export function getMockFearGreedData(): FearGreedValue[] {
  return Array.from({ length: 30 }, (_, i) => {
    const value = 25 + Math.floor(Math.random() * 50);
    let classification: FearGreedClassification = "Neutral";
    if (value <= 25) classification = "Extreme Fear";
    else if (value <= 45) classification = "Fear";
    else if (value <= 55) classification = "Neutral";
    else if (value <= 75) classification = "Greed";
    else classification = "Extreme Greed";

    return {
      value,
      classification,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    };
  }).reverse();
}

