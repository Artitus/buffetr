/**
 * Precious Metals API Client
 * Using metals.live API for free gold/silver prices
 * Alternative: goldapi.io (requires API key)
 */

interface MetalsLivePrice {
  gold: number;
  silver: number;
  platinum: number;
  palladium: number;
  timestamp: number;
}

interface MetalsApiResponse {
  success: boolean;
  base: string;
  timestamp: number;
  rates: {
    XAU: number; // Gold
    XAG: number; // Silver
  };
}

// Using metals.live - free API, no key required
const METALS_LIVE_API = "https://api.metals.live/v1";

// Alternative: Gold-API.io (requires free API key)
const GOLD_API_BASE = "https://www.goldapi.io/api";

export async function fetchMetalsLive(): Promise<{
  gold: number;
  silver: number;
  timestamp: Date;
} | null> {
  try {
    const response = await fetch(`${METALS_LIVE_API}/spot`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Metals API error: ${response.status}`);
    }

    const data: MetalsLivePrice[] = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error("No metals data received");
    }

    // metals.live returns an array with latest prices
    const latest = data[0];

    return {
      gold: latest.gold,
      silver: latest.silver,
      timestamp: new Date(latest.timestamp * 1000),
    };
  } catch (error) {
    console.error("Error fetching metals prices:", error);
    return null;
  }
}

// Alternative using Gold-API.io (if metals.live is unavailable)
export async function fetchGoldApi(): Promise<{
  gold: number;
  silver: number;
  timestamp: Date;
} | null> {
  const apiKey = process.env.GOLD_API_KEY;
  if (!apiKey) {
    console.warn("GOLD_API_KEY not configured, falling back to metals.live");
    return fetchMetalsLive();
  }

  try {
    // Fetch gold price
    const goldResponse = await fetch(`${GOLD_API_BASE}/XAU/USD`, {
      headers: {
        "x-access-token": apiKey,
      },
      next: { revalidate: 300 },
    });

    // Fetch silver price
    const silverResponse = await fetch(`${GOLD_API_BASE}/XAG/USD`, {
      headers: {
        "x-access-token": apiKey,
      },
      next: { revalidate: 300 },
    });

    if (!goldResponse.ok || !silverResponse.ok) {
      throw new Error("Gold API error");
    }

    const goldData = await goldResponse.json();
    const silverData = await silverResponse.json();

    return {
      gold: goldData.price,
      silver: silverData.price,
      timestamp: new Date(goldData.timestamp * 1000),
    };
  } catch (error) {
    console.error("Error fetching from Gold API:", error);
    return fetchMetalsLive(); // Fallback to metals.live
  }
}

// Main function to get metals prices - tries multiple sources
export async function fetchMetalsPrices(): Promise<{
  gold: number;
  silver: number;
  timestamp: Date;
} | null> {
  // Try metals.live first (free, no key required)
  const metalsLive = await fetchMetalsLive();
  if (metalsLive) {
    return metalsLive;
  }

  // Fallback to Gold API if available
  return fetchGoldApi();
}

// Mock data for development/testing when APIs are unavailable
export function getMockMetalsPrices(): {
  gold: number;
  silver: number;
  timestamp: Date;
} {
  // Approximate current market prices (update as needed)
  return {
    gold: 2650.0,
    silver: 31.5,
    timestamp: new Date(),
  };
}

