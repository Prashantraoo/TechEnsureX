import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { register } from "@/lib/auth";

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);

    const name = fd.get("name") as string;
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;

    if (password !== confirm) {
      toast.error("Passwords don't match");
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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="flex items-center justify-center p-6 sm:p-12 order-2 lg:order-1">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary grid place-items-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">TechEnsureX</span>
          </div>
          <h1 className="font-display text-3xl font-bold">Create your account</h1>
          <p className="text-muted-foreground mt-2">Start your 14-day free trial. No card required.</p>

          <Button variant="outline" className="w-full mt-6 h-11">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign up with Google
          </Button>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="name" name="name" required placeholder="Aarav Sharma" className="pl-10 h-11" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" name="email" type="email" required placeholder="you@hospital.com" className="pl-10 h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" name="password" type="password" required minLength={8} className="pl-10 h-11" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="confirm" name="confirm" type="password" required minLength={8} className="pl-10 h-11" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              By creating an account, you agree to our <a className="text-primary hover:underline" href="#">Terms</a> & <a className="text-primary hover:underline" href="#">Privacy Policy</a>.
            </p>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-primary hover:opacity-90">
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            Already have an account? <Link to="/sign-in" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:flex relative bg-gradient-primary text-primary-foreground p-12 flex-col justify-between overflow-hidden order-1 lg:order-2">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <Link to="/" className="relative flex items-center gap-2 self-end">
          <div className="w-9 h-9 rounded-xl bg-white/20 grid place-items-center backdrop-blur">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg">TechEnsureX</span>
        </Link>
        <div className="relative">
          <h2 className="font-display text-4xl font-bold leading-tight">Join 95,000+ patients & 200+ insurers</h2>
          <p className="mt-4 text-primary-foreground/80 max-w-sm">
            AI-powered medical insurance, blockchain-verified claims, and instant payouts — all in one secure platform.
          </p>
        </div>
        <p className="relative text-xs text-primary-foreground/60">© TechEnsureX · Backed by IIT Bombay</p>
      </div>
    </div>
  );
}
