import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, X, Lock, ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface AuthGateModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthGateModal({ open, onClose }: AuthGateModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal — enter is alive (spring), exit is fast and flat. Asymmetric
              on purpose: the user is deciding on enter, the system is just
              closing on exit. Never scale from 0 — 0.92 keeps a visible shape. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 350 } }}
            exit={{ opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-gate-title"
          >
            <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-elevated overflow-hidden">
              {/* Top gradient strip */}
              <div className="h-2 bg-gradient-primary" />

              {/* Close button */}
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors z-10 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="p-8 text-center">
                {/* Lock icon settles into place once — no infinite motion on a modal you're trying to read. */}
                <motion.div
                  initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 16, stiffness: 260 }}
                  className="w-16 h-16 mx-auto rounded-2xl bg-gradient-primary grid place-items-center mb-6"
                >
                  <Lock className="w-7 h-7 text-primary-foreground" />
                </motion.div>

                <h2 id="auth-gate-title" className="font-display text-2xl font-bold text-foreground">
                  Sign in to continue
                </h2>
                <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
                  Create a free account or sign in to access your personalized insurance dashboard, AI health reports, and claims management.
                </p>

                {/* Feature pills */}
                <div className="flex flex-wrap justify-center gap-2 mt-5">
                  {[
                    { icon: Sparkles, text: "AI Health Insights" },
                    { icon: ShieldCheck, text: "Secure Verification" },
                    { icon: Zap, text: "Instant Claims" },
                  ].map((f) => (
                    <span
                      key={f.text}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      <f.icon className="w-3 h-3" />
                      {f.text}
                    </span>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div className="mt-7 space-y-3">
                  <Button
                    asChild
                    className="w-full h-12 bg-gradient-primary hover:opacity-95 text-base font-semibold shadow-elevated group"
                  >
                    <Link to="/sign-up">
                      Create free account
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-12 text-base border-2"
                  >
                    <Link to="/sign-in">
                      Sign in to existing account
                    </Link>
                  </Button>
                </div>

                {/* Trust footer */}
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-3.5 h-3.5" />
                  <span>HIPAA-aligned · 256-bit encryption · SOC2 compliant</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
