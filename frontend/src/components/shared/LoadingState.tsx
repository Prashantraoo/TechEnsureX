import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  variant?: "spinner" | "cards" | "table" | "list";
  rows?: number;
  className?: string;
}

/**
 * Prefer "cards"/"table"/"list" over "spinner" wherever the loaded shape is
 * known ahead of time — a skeleton that mirrors the final layout reads as
 * intentional; a spinner reads as "still figuring out what to show you."
 */
export function LoadingState({ variant = "spinner", rows = 4, className }: LoadingStateProps) {
  if (variant === "spinner") {
    return (
      <div className={cn("flex items-center justify-center py-16", className)}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={cn("grid sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-md" />
        ))}
      </div>
    );
  }

  // list
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
