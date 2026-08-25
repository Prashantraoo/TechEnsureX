import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type GaugeTone = "primary" | "success" | "warning" | "error" | "info";

const TONE_STROKE: Record<GaugeTone, string> = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  error: "hsl(var(--destructive))",
  info: "hsl(var(--info))",
};

interface RadialGaugeProps {
  /** 0-100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: GaugeTone;
  label?: string;
  className?: string;
}

/**
 * A performance-vs-target gauge for a single headline KPI (UI UX Pro Max:
 * gauge/bullet chart is the right pattern for one metric measured against
 * an implicit target — a plain number can't show "how full" at a glance).
 */
export function RadialGauge({ value, size = 88, strokeWidth = 8, tone = "primary", label, className }: RadialGaugeProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={label ? `${label}: ${clamped}%` : `${clamped}%`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduceMotion ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduceMotion ? 0 : 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-bold text-foreground">{Math.round(clamped)}%</span>
      </div>
    </div>
  );
}
