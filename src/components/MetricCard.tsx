"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: "emerald" | "amber" | "cyan" | "blue" | "slate" | "red";
  isLoading?: boolean;
}

const colorVariants = {
  emerald: {
    gradient: "from-emerald-500/10 to-emerald-600/5",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    value: "text-emerald-300",
  },
  amber: {
    gradient: "from-amber-500/10 to-amber-600/5",
    border: "border-amber-500/20",
    text: "text-amber-400",
    value: "text-amber-300",
  },
  cyan: {
    gradient: "from-cyan-500/10 to-cyan-600/5",
    border: "border-cyan-500/20",
    text: "text-cyan-400",
    value: "text-cyan-300",
  },
  blue: {
    gradient: "from-blue-500/10 to-blue-600/5",
    border: "border-blue-500/20",
    text: "text-blue-400",
    value: "text-blue-300",
  },
  slate: {
    gradient: "from-slate-500/10 to-slate-600/5",
    border: "border-slate-500/20",
    text: "text-slate-300",
    value: "text-slate-200",
  },
  red: {
    gradient: "from-red-500/10 to-red-600/5",
    border: "border-red-500/20",
    text: "text-red-400",
    value: "text-red-300",
  },
};

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  color = "slate",
  isLoading,
}: MetricCardProps) {
  const colors = colorVariants[color];

  if (isLoading) {
    return (
      <Card
        className={cn(
          "p-4 rounded-xl bg-gradient-to-br border",
          colors.gradient,
          colors.border
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-16" />
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "p-4 rounded-xl bg-gradient-to-br border transition-all duration-200 hover:scale-[1.02]",
        colors.gradient,
        colors.border
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className={colors.text}>{icon}</span>}
        <span className={cn("text-sm font-medium", colors.text)}>{title}</span>
      </div>
      <p className={cn("text-2xl font-bold tabular-nums", colors.value)}>{value}</p>
      {(subtitle || change !== undefined) && (
        <div className="flex items-center gap-2 mt-1">
          {change !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                change > 0 ? "text-emerald-400" : change < 0 ? "text-red-400" : "text-slate-400"
              )}
            >
              {change > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : change < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {Math.abs(change).toFixed(1)}%
              {changeLabel && <span className="text-slate-500 ml-1">{changeLabel}</span>}
            </span>
          )}
          {subtitle && !change && (
            <span className="text-xs text-slate-500">{subtitle}</span>
          )}
        </div>
      )}
    </Card>
  );
}

