import type { ReactNode } from "react";
import { motion } from "framer-motion";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * The authentication surface shared by sign-in and sign-up. Deliberately
 * light — a large radius and a barely-there border so the panel reads as
 * floating on the page rather than boxed into it; elevation comes from a
 * soft, wide, low-opacity shadow rather than a heavy default one.
 */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="w-full bg-card/95 backdrop-blur-sm border border-border/60 rounded-[28px] p-8 sm:p-10"
      style={{ boxShadow: "0 2px 6px hsl(221 39% 20% / 0.03), 0 24px 60px -24px hsl(221 39% 20% / 0.12)" }}
    >
      {children}
    </motion.div>
  );
}
