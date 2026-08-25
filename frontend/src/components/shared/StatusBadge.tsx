import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  neutral: "bg-muted text-muted-foreground border-transparent",
};

/**
 * Canonical status → tone mapping across claims, billing, settlement, and
 * plan status vocab. Add new statuses here rather than re-deriving tone
 * logic per page — keeps "approved" green everywhere, not accent in Claims
 * and success in Billing.
 */
const STATUS_TONE_MAP: Record<string, StatusTone> = {
  // Claims
  submitted: "info",
  "under review": "info",
  "ai verification": "info",
  processing: "info",
  "documents required": "warning",
  approved: "success",
  settled: "success",
  paid: "success",
  active: "success",
  rejected: "error",
  failed: "error",
  declined: "error",
  expired: "neutral",
  cancelled: "neutral",
  pending: "warning",
  draft: "neutral",
};

export function statusTone(status: string | undefined | null): StatusTone {
  if (!status) return "neutral";
  return STATUS_TONE_MAP[status.toLowerCase()] ?? "neutral";
}

interface StatusBadgeProps {
  status: string;
  tone?: StatusTone;
  className?: string;
}

/** A status pill whose color always carries meaning — never decorative. */
export function StatusBadge({ status, tone, className }: StatusBadgeProps) {
  const resolved = tone ?? statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[resolved],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-success": resolved === "success",
        "bg-warning": resolved === "warning",
        "bg-destructive": resolved === "error",
        "bg-info": resolved === "info",
        "bg-muted-foreground": resolved === "neutral",
      })} />
      {status}
    </span>
  );
}
