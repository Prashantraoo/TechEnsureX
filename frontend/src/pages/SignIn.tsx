import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { login } from "@/lib/auth";

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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative bg-gradient-primary text-primary-foreground p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white/20 grid place-items-center backdrop-blur">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg">TechEnsureX</span>
        </Link>

        <div className="relative">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Smart claims.<br />Trusted payouts.
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-sm">
            Sign in to track claims, get AI-driven recommendations, and manage your healthcare coverage.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {["99.4%", "12s", "200+"].map((v, i) => (
              <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                <p className="font-bold text-xl">{v}</p>
                <p className="text-xs text-primary-foreground/70">{["Accuracy", "Decision", "Partners"][i]}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-primary-foreground/60">© TechEnsureX · Backed by IIT Bombay</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary grid place-items-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">TechEnsureX</span>
          </div>
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to access your insurance dashboard.</p>

          <Button variant="outline" className="w-full mt-6 h-11">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@hospital.com"
                  className="pl-10 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="pw">Password</Label>
                <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="pw"
                  type={show ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="rounded border-border" /> Remember me
            </label>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-primary hover:opacity-90">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            Don't have an account? <Link to="/sign-up" className="text-primary font-medium hover:underline">Create one</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
