/**
 * Financial News Headlines
 * Using mock data for now - in production, could integrate with:
 * - NewsAPI.org
 * - Alpha Vantage News
 * - Finnhub News
 */

export interface NewsHeadline {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: "market" | "economy" | "crypto" | "housing";
}

// Mock headlines for demo - these would come from a news API in production
export function getMockNewsHeadlines(): NewsHeadline[] {
  const headlines: NewsHeadline[] = [
    {
      id: "1",
      title: "Fed signals potential rate cuts in 2025 amid cooling inflation",
      source: "Reuters",
      url: "#",
      publishedAt: new Date().toISOString(),
      category: "economy",
    },
    {
      id: "2", 
      title: "S&P 500 reaches new all-time high as tech stocks rally",
      source: "Bloomberg",
      url: "#",
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      category: "market",
    },
    {
      id: "3",
      title: "Bitcoin surges past $95,000 on ETF inflows",
      source: "CoinDesk",
      url: "#",
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      category: "crypto",
    },
    {
      id: "4",
      title: "Housing starts decline as mortgage rates remain elevated",
      source: "CNBC",
      url: "#",
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
      category: "housing",
    },
    {
      id: "5",
      title: "Gold prices steady as investors await inflation data",
      source: "MarketWatch",
      url: "#",
      publishedAt: new Date(Date.now() - 14400000).toISOString(),
      category: "market",
    },
    {
      id: "6",
      title: "Unemployment claims fall to 6-month low",
      source: "WSJ",
      url: "#",
      publishedAt: new Date(Date.now() - 18000000).toISOString(),
      category: "economy",
    },
  ];

  return headlines;
}

export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function getCategoryColor(category: NewsHeadline["category"]): string {
  switch (category) {
    case "market":
      return "blue";
    case "economy":
      return "emerald";
    case "crypto":
      return "orange";
    case "housing":
      return "purple";
    default:
      return "gray";
  }
}

