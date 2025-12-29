"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TimeRange = "1M" | "3M" | "1Y" | "5Y" | "10Y" | "ALL";

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  className?: string;
}

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: "1M", label: "1 Month" },
  { value: "3M", label: "3 Months" },
  { value: "1Y", label: "1 Year" },
  { value: "5Y", label: "5 Years" },
  { value: "10Y", label: "10 Years" },
  { value: "ALL", label: "All Time" },
];

export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TimeRange)}>
      <SelectTrigger className={`w-[130px] h-9 text-sm ${className || ""}`}>
        <SelectValue placeholder="Time range" />
      </SelectTrigger>
      <SelectContent>
        {timeRangeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Helper to filter data by time range
export function filterDataByTimeRange<T extends { date: string }>(
  data: T[],
  range: TimeRange
): T[] {
  if (range === "ALL" || !data.length) return data;

  const now = new Date();
  let cutoffDate: Date;

  switch (range) {
    case "1M":
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case "3M":
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case "1Y":
      cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case "5Y":
      cutoffDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      break;
    case "10Y":
      cutoffDate = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
      break;
    default:
      return data;
  }

  const filtered = data.filter((item) => new Date(item.date) >= cutoffDate);
  
  // Return at least some data if filter is too aggressive
  return filtered.length > 0 ? filtered : data.slice(-30);
}
