"use client";

import { Card, Title, Text, Badge, Flex } from "@tremor/react";
import { Newspaper, ExternalLink, Clock } from "lucide-react";
import { getMockNewsHeadlines, getTimeAgo, getCategoryColor, type NewsHeadline } from "@/lib/data-sources/news";

interface NewsHeadlinesProps {
  limit?: number;
}

export function NewsHeadlines({ limit = 5 }: NewsHeadlinesProps) {
  const headlines = getMockNewsHeadlines().slice(0, limit);

  return (
    <Card className="hover-lift">
      <Flex alignItems="center" className="gap-2 mb-4">
        <Newspaper className="w-5 h-5 text-primary" />
        <Title>Market Headlines</Title>
      </Flex>

      <div className="space-y-3">
        {headlines.map((headline) => (
          <NewsItem key={headline.id} headline={headline} />
        ))}
      </div>

      <Text className="text-muted-foreground text-xs mt-4 text-center">
        Headlines are for demonstration purposes
      </Text>
    </Card>
  );
}

function NewsItem({ headline }: { headline: NewsHeadline }) {
  return (
    <a
      href={headline.url}
      className="block p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
    >
      <Flex justifyContent="between" alignItems="start" className="gap-2">
        <div className="flex-1 min-w-0">
          <Text className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {headline.title}
          </Text>
          <Flex alignItems="center" className="gap-2 mt-2">
            <Badge color={getCategoryColor(headline.category) as "blue" | "emerald" | "orange" | "purple"} size="xs">
              {headline.category}
            </Badge>
            <Text className="text-muted-foreground text-xs">{headline.source}</Text>
            <Flex alignItems="center" className="gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <Text className="text-xs">{getTimeAgo(headline.publishedAt)}</Text>
            </Flex>
          </Flex>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </Flex>
    </a>
  );
}

