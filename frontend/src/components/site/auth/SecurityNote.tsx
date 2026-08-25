import { ShieldCheck } from "lucide-react";

/** The reassurance line below the auth card. */
export function SecurityNote() {
  return (
    <p className="mt-3 flex w-full items-center justify-start gap-1.5 text-left text-xs text-muted-foreground/80">
      <ShieldCheck className="w-3.5 h-3.5 text-primary/70 shrink-0" />
      Your data is encrypted and secured with industry-leading protection.
    </p>
  );
}
