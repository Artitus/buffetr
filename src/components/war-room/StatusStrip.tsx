"use client";

import { cn } from "@/lib/utils";

export interface StatusItem {
  key: string;
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}

interface StatusStripProps {
  items: StatusItem[];
}

const toneClass: Record<NonNullable<StatusItem["tone"]>, string> = {
  neutral: "text-[var(--wr-muted)]",
  good: "text-emerald-400",
  warn: "text-amber-400",
  bad: "text-rose-400",
};

export function StatusStrip({ items }: StatusStripProps) {
  return (
    <div className="flex gap-0 overflow-x-auto border-y border-[var(--wr-border)] bg-[var(--wr-panel)]">
      {items.map((item, i) => (
        <div
          key={item.key}
          className={cn(
            "flex min-w-[9rem] shrink-0 flex-col gap-0.5 px-4 py-2",
            i > 0 && "border-l border-[var(--wr-border)]"
          )}
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--wr-dim)]">
            {item.label}
          </span>
          <span
            className={cn(
              "font-mono text-sm tabular-nums",
              toneClass[item.tone || "neutral"]
            )}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
