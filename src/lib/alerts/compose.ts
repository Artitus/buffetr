import type { FluxEvent } from "./flux";

export interface TweetDraft {
  text: string;
  characters: number;
  events: string[];
}

export interface RssItemDraft {
  title: string;
  description: string;
  link: string;
  guid: string;
  pubDate: string;
  category: string;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://buffetr.app";

export function composeTweet(events: FluxEvent[]): TweetDraft {
  if (events.length === 0) {
    return {
      text: "Buffetr war room: no flux alerts right now. Markets quiet on monitored bands.",
      characters: 0,
      events: [],
    };
  }

  const top = events.slice(0, 3);
  const lines = top.map((e) => {
    const sev = e.severity === "alert" ? "ALERT" : e.severity.toUpperCase();
    return `[${sev}] ${e.message}`;
  });

  let text = `Buffetr\n${lines.join("\n")}`;
  if (text.length > 260) {
    text = text.slice(0, 257) + "...";
  }
  text = `${text}\n${SITE}`;

  return {
    text,
    characters: text.length,
    events: top.map((e) => e.ruleId),
  };
}

export function composeRssItem(event: FluxEvent): RssItemDraft {
  const guid = `buffetr-flux-${event.ruleId}-${event.recordedAt}`;
  return {
    title: `[${event.severity}] ${event.label}`,
    description: event.message,
    link: `${SITE}/#${event.metricType}`,
    guid,
    pubDate: new Date(event.recordedAt).toUTCString(),
    category: event.metricType,
  };
}

export function composeRssFeed(events: FluxEvent[]): string {
  const items = events.map((e) => {
    const item = composeRssItem(e);
    return `    <item>
      <title><![CDATA[${item.title}]]></title>
      <description><![CDATA[${item.description}]]></description>
      <link>${item.link}</link>
      <guid isPermaLink="false">${item.guid}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <category>${item.category}</category>
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Buffetr War Room Alerts</title>
    <link>${SITE}</link>
    <description>Stub flux alerts for Buffetr (no live X delivery)</description>
    <language>en-us</language>
${items.join("\n")}
  </channel>
</rss>`;
}
