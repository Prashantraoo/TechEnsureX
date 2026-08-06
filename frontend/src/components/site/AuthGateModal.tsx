import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, X, Lock, ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthGateModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthGateModal({ open, onClose }: AuthGateModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-elevated overflow-hidden">
              {/* Top gradient strip */}
              <div className="h-2 bg-gradient-primary" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="p-8 text-center">
                {/* Animated lock icon */}
                <motion.div
                  initial={{ rotate: -10 }}
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 mx-auto rounded-2xl bg-gradient-primary grid place-items-center shadow-glow mb-6"
                >
                  <Lock className="w-7 h-7 text-primary-foreground" />
                </motion.div>

                <h2 className="font-display text-2xl font-bold text-foreground">
                  Sign in to continue
                </h2>
                <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
                  Create a free account or sign in to access your personalized insurance dashboard, AI health reports, and claims management.
                </p>

                {/* Feature pills */}
                <div className="flex flex-wrap justify-center gap-2 mt-5">
                  {[
                    { icon: Sparkles, text: "AI Health Insights" },
                    { icon: ShieldCheck, text: "Blockchain Verified" },
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
