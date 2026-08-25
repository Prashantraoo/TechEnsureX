import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { login } from "@/lib/auth";
import { AuthLayout } from "@/components/site/auth/AuthLayout";
import { AuthCard } from "@/components/site/auth/AuthCard";
import { AuthInput } from "@/components/site/auth/AuthInput";
import { SocialLoginButton } from "@/components/site/auth/SocialLoginButton";
import { SecurityNote } from "@/components/site/auth/SecurityNote";

export default function SignIn() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back to TechEnsureX!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <div className="text-center">
          <h1 className="font-display text-3xl sm:text-[2.25rem] font-bold text-foreground tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-2.5">Sign in to access your TechEnsureX dashboard</p>
        </div>

        <div className="mt-6">
          <SocialLoginButton label="Continue with Google" />
        </div>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <AuthInput
              id="email"
              icon={Mail}
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label htmlFor="pw">Password</Label>
              <a href="#" className="text-xs font-medium text-primary hover:underline underline-offset-2 transition-opacity hover:opacity-80">Forgot password?</a>
            </div>
            <AuthInput
              id="pw"
              icon={Lock}
              type={show ? "text" : "password"}
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" defaultChecked className="rounded border-border accent-primary" /> Remember me
          </label>
          <Button
            type="submit"
            disabled={loading}
            className="group w-full h-[52px] rounded-xl bg-gradient-primary hover:opacity-95 shadow-soft transition-all hover:shadow-hover"
          >
            {loading ? (
              "Signing in..."
            ) : (
              <>
                Sign in
                <ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-5 text-sm text-center text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/sign-up" className="text-primary font-semibold hover:underline underline-offset-2 transition-opacity hover:opacity-80">
            Create one
          </Link>
        </p>
      </AuthCard>

      <SecurityNote />
    </AuthLayout>
  );
}
