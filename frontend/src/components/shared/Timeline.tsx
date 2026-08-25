import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineStep {
  label: string;
  description?: string;
  timestamp?: string;
  state: "complete" | "current" | "upcoming" | "error";
}

const DOT_CLASSES: Record<TimelineStep["state"], string> = {
  complete: "bg-success border-success text-success-foreground",
  current: "bg-primary border-primary text-primary-foreground",
  upcoming: "bg-background border-border text-transparent",
  error: "bg-destructive border-destructive text-destructive-foreground",
};

/**
 * Progress timeline — claim status history, settlement stages. Vertical by
 * default; pass `orientation="horizontal"` for a desktop-width stepper
 * (falls back to the vertical layout below `sm` so it never causes
 * horizontal scrolling on narrow screens).
 */
export function Timeline({ steps, orientation = "vertical" }: { steps: TimelineStep[]; orientation?: "vertical" | "horizontal" }) {
  if (orientation === "horizontal") {
    return (
      <ol className="flex flex-col sm:flex-row sm:items-start">
        {steps.map((step, i) => (
          <li key={step.label} className="relative flex sm:flex-col sm:items-center gap-4 sm:gap-0 sm:flex-1 pb-8 sm:pb-0 last:pb-0">
            {i < steps.length - 1 && (
              <>
                {/* vertical connector on mobile */}
                <span
                  className={cn(
                    "absolute left-[11px] top-6 -bottom-2 w-px sm:hidden",
                    step.state === "complete" ? "bg-success/40" : "bg-border",
                  )}
                />
                {/* horizontal connector at sm+ */}
                <span
                  className={cn(
                    "hidden sm:block absolute top-3 left-[calc(50%+16px)] right-[calc(-50%+16px)] h-px",
                    step.state === "complete" ? "bg-success/40" : "bg-border",
                  )}
                />
              </>
            )}
            <span
              className={cn(
                "relative z-10 mt-0.5 sm:mt-0 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2",
                DOT_CLASSES[step.state],
              )}
            >
              {step.state === "complete" && <Check className="h-3.5 w-3.5" />}
              {step.state === "error" && <X className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1 sm:flex-none pt-0.5 sm:pt-3 sm:text-center">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {step.label}
              </p>
              {step.timestamp && <p className="text-xs text-muted-foreground mt-0.5">{step.timestamp}</p>}
              {step.description && <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>}
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol>
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex gap-4 pb-8 last:pb-0">
          {i < steps.length - 1 && (
            <span
              className={cn(
                "absolute left-[11px] top-6 -bottom-2 w-px",
                step.state === "complete" ? "bg-success/40" : "bg-border",
              )}
            />
          )}
          <span
            className={cn(
              "relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2",
              DOT_CLASSES[step.state],
            )}
          >
            {step.state === "complete" && <Check className="h-3.5 w-3.5" />}
            {step.state === "error" && <X className="h-3.5 w-3.5" />}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {step.label}
              </p>
              {step.timestamp && <p className="text-xs text-muted-foreground">{step.timestamp}</p>}
            </div>
            {step.description && <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
