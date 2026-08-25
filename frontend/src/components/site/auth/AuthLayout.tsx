import type { ReactNode } from "react";
import { BrandPanel } from "./BrandPanel";

/**
 * Full-screen split authentication canvas: an editorial brand panel
 * (~54%) blending into the auth panel (~46%) on the right. Deliberately
 * ONE background, not two bordered halves — the "seam" is a soft
 * left-to-right gradient wash, never a visible rule. On mobile the form
 * takes visual priority — it renders first via `order`, and the brand
 * panel drops below it with its illustration hidden.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen lg:h-screen bg-background overflow-x-hidden lg:overflow-hidden">
      {/* The blend: a wide, extremely soft blue-tinted wash that fades out
          well before the right panel begins, so there is never a hard
          edge — just one canvas that happens to read as "brand" on the
          left and "form" on the right. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, hsl(var(--primary) / 0.07) 0%, hsl(var(--primary) / 0.03) 32%, transparent 58%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute top-[-10%] left-[-6%] w-[640px] h-[640px] rounded-full bg-primary/[0.05] blur-[170px]" />
      <div aria-hidden className="pointer-events-none absolute bottom-[-15%] left-[18%] w-[520px] h-[520px] rounded-full bg-secondary/[0.05] blur-[160px]" />
      <div aria-hidden className="pointer-events-none absolute top-[-20%] right-[-10%] w-[560px] h-[560px] rounded-full bg-primary/[0.04] blur-[170px]" />

      {/* Bounded to a max-width so the two halves stay visually balanced
          instead of drifting apart on ultra-wide desktops; the ambient
          background above stays full-bleed regardless. */}
      <div className="relative mx-auto flex min-h-screen lg:h-screen max-w-[1680px] flex-col lg:grid lg:grid-cols-[54%_46%]">
        <div className="order-2 lg:order-1">
          <BrandPanel />
        </div>
        <div className="order-1 lg:order-2 relative flex items-center justify-center px-6 pt-6 pb-8 lg:pt-2 lg:pb-4">
          <div className="relative w-full max-w-[29rem] flex flex-col items-center">{children}</div>
        </div>
      </div>
    </div>
  );
}
