import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Shield, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { register } from "@/lib/auth";
import { AuthInput } from "@/components/site/auth/AuthInput";
import { SocialLoginButton } from "@/components/site/auth/SocialLoginButton";
import { cn } from "@/lib/utils";

const EASE = [0.23, 1, 0.32, 1] as const;

const STEPS = ["Account", "Profile", "Preferences"];

/** The current step in a notional onboarding sequence — this form only
 * ever performs step 1 (creating the account); "Profile" and "Preferences"
 * are shown as upcoming, not implemented here, and are never rendered as
 * clickable or in-progress. */
function OnboardingSteps({ current }: { current: number }) {
  return (
    <div className="mt-7 flex items-center justify-center">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
                  active ? "bg-primary text-primary-foreground" : done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {String(n).padStart(2, "0")}
              </span>
              <span className={cn("text-xs font-medium hidden sm:inline", active ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
            {n < STEPS.length && <span aria-hidden className="h-px w-8 sm:w-12 bg-border mx-2.5" />}
          </div>
        );
      })}
    </div>
  );
}

type StrengthTone = "destructive" | "warning" | "success";
interface Strength {
  score: number; // 0-5
  label: string;
  tone: StrengthTone;
}

/** Purely a UI helper — never sent to the server, never affects the actual
 * minLength=8 validation already enforced on the input. */
function getPasswordStrength(password: string): Strength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", tone: "destructive" };
  if (score === 2) return { score, label: "Fair", tone: "warning" };
  if (score === 3) return { score, label: "Good", tone: "warning" };
  if (score === 4) return { score, label: "Strong", tone: "success" };
  return { score, label: "Very strong", tone: "success" };
}

const STRENGTH_BAR_CLASS: Record<StrengthTone, string> = {
  destructive: "bg-destructive",
  warning: "bg-warning",
  success: "bg-success",
};
const STRENGTH_TEXT_CLASS: Record<StrengthTone, string> = {
  destructive: "text-destructive",
  warning: "text-warning",
  success: "text-success",
};

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();
  const strength = getPasswordStrength(password);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);

    const name = fd.get("name") as string;
    const email = fd.get("email") as string;
    const confirm = fd.get("confirm") as string;

    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (!agreed) {
      toast.error("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Account created! Welcome to TechEnsureX.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-5 sm:px-10 h-20 shrink-0">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center transition-transform duration-300 group-hover:scale-105">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-extrabold text-base tracking-tight text-foreground">
            Tech<span className="text-primary">EnsureX</span>
          </span>
        </Link>
        <p className="text-sm text-muted-foreground">
          <span className="hidden sm:inline">Already have an account? </span>
          <Link to="/sign-in" className="text-primary font-semibold hover:underline underline-offset-2 transition-opacity hover:opacity-80">
            Sign in
          </Link>
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center px-5 sm:px-6 pt-2 sm:pt-6 pb-14">
        <div className="w-full max-w-[520px]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="text-center"
          >
            <div className="mx-auto w-11 h-11 rounded-xl bg-primary/10 grid place-items-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="mt-4 font-display text-2xl sm:text-[1.75rem] font-bold text-foreground tracking-tight">
              Create your TechEnsureX account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Set up your secure insurance workspace in a few steps.</p>
          </motion.div>

          <OnboardingSteps current={1} />

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: EASE }}
            className="mt-8 bg-card border border-border rounded-[20px] p-7 sm:p-9 shadow-soft"
          >
            <SocialLoginButton label="Continue with Google" />

            <div className="flex items-center gap-3 my-6">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Account details</p>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <AuthInput id="name" name="name" icon={User} required placeholder="Full name" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <AuthInput id="email" name="email" icon={Mail} type="email" required placeholder="Email address" />
                <p className="text-xs text-muted-foreground">Use your work email for faster verification.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <AuthInput
                  id="password"
                  name="password"
                  icon={Lock}
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                {password ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Password strength</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-1 w-5 rounded-full transition-colors",
                              i < strength.score ? STRENGTH_BAR_CLASS[strength.tone] : "bg-border",
                            )}
                          />
                        ))}
                      </div>
                      <span className={cn("text-xs font-medium", STRENGTH_TEXT_CLASS[strength.tone])}>{strength.label}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">At least 8 characters with a number and symbol.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <AuthInput
                  id="confirm"
                  name="confirm"
                  icon={Lock}
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Confirm password"
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                <span>
                  I agree to the{" "}
                  <a href="#" className="text-primary hover:underline underline-offset-2 transition-opacity hover:opacity-80">Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" className="text-primary hover:underline underline-offset-2 transition-opacity hover:opacity-80">Privacy Policy</a>
                </span>
              </label>

              <Button
                type="submit"
                disabled={loading}
                className="group w-full h-[52px] rounded-xl bg-gradient-primary hover:opacity-95 shadow-soft transition-all hover:shadow-hover"
              >
                {loading ? (
                  "Creating..."
                ) : (
                  <>
                    Create account
                    <ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link to="/sign-in" className="text-primary font-semibold hover:underline underline-offset-2 transition-opacity hover:opacity-80">
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </main>

      <footer className="shrink-0 pb-10 text-center px-5">
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
          <Lock className="w-3.5 h-3.5 text-primary/70 shrink-0" />
          Your information is encrypted and protected.
        </p>
        <p className="mt-2 text-xs text-muted-foreground/60">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          {" "}&middot;{" "}
          <a href="#" className="hover:text-foreground transition-colors">Security</a>
          {" "}&middot;{" "}
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
        </p>
      </footer>
    </div>
  );
}
