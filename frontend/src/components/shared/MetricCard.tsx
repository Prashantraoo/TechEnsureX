import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricTone = "primary" | "success" | "warning" | "error" | "info" | "neutral";

const TONE_CLASSES: Record<MetricTone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  neutral: "bg-muted text-muted-foreground",
};

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: MetricTone;
  trend?: string;
  /** Trend direction — colors the trend pill semantically instead of always using the tile's tone. */
  trendDirection?: "up" | "down";
  /** Small muted line under the value, e.g. "vs last period". */
  caption?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const TREND_CLASSES: Record<"up" | "down", string> = {
  up: "bg-success/10 text-success",
  down: "bg-destructive/10 text-destructive",
};

/** A single stat tile. Works both as a passive metric and a clickable filter (Claims summary row). */
export function MetricCard({ label, value, icon: Icon, tone = "primary", trend, trendDirection, caption, active, onClick, className }: MetricCardProps) {
  const interactive = Boolean(onClick);

  return (
    <Card
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
      className={cn(
        "p-5",
        interactive && "hover-card cursor-pointer transition-[background-color,transform,box-shadow] duration-150 hover:bg-muted/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active && "border-primary/40 ring-1 ring-primary/20",
        className,
      )}
    >
      {Icon ? (
        <div className={cn("w-10 h-10 rounded-lg grid place-items-center mb-4", TONE_CLASSES[tone])}>
          <Icon className="w-5 h-5" />
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="font-display text-2xl font-bold text-foreground">{value}</p>
        {trend && (
          <span className={cn(
            "text-xs font-medium rounded-full px-1.5 py-0.5",
            trendDirection ? TREND_CLASSES[trendDirection] : "text-muted-foreground bg-muted",
          )}>
            {trend}
          </span>
        )}
      </div>
      {caption && <p className="text-xs text-muted-foreground mt-1">{caption}</p>}
    </Card>
  );
}
