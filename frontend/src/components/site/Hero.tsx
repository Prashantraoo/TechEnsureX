import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, PlayCircle, Sparkles, ShieldCheck, Activity, FileCheck2, HeartPulse, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import AuthGateModal from "./AuthGateModal";
import heroImg from "@/assets/hero-dashboard.jpg";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.08 * i, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Hero() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <section className="relative pt-32 md:pt-40 pb-24 overflow-hidden bg-gradient-hero">
      {/* Decorative background layers */}
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />

      {/* Animated orbs */}
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-40 -right-20 w-[480px] h-[480px] bg-primary/20 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-40 -left-20 w-[520px] h-[520px] bg-secondary/20 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[120px]"
      />

      <div className="container relative grid lg:grid-cols-12 gap-12 items-center">
        {/* Left content */}
        <div className="lg:col-span-7">
          <motion.div
            initial="hidden" animate="show" custom={0} variants={fadeUp}
            className="inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full glass-strong text-xs font-semibold shadow-soft"
          >
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-primary text-primary-foreground">
              <Zap className="w-3 h-3" /> NEW
            </span>
            <span className="text-foreground/80">AI Claim Engine v3 · Backed by IIT Bombay</span>
          </motion.div>

          <motion.h1
            initial="hidden" animate="show" custom={1} variants={fadeUp}
            className="display-text mt-7 text-[2.75rem] sm:text-6xl lg:text-7xl xl:text-[5.25rem] font-extrabold text-foreground"
          >
            Medical claims,<br />
            <span className="text-gradient-vibrant">settled in minutes</span><br />
            <span className="font-serif-italic text-foreground/80 font-normal">not weeks.</span>
          </motion.h1>

          <motion.p
            initial="hidden" animate="show" custom={2} variants={fadeUp}
            className="mt-7 text-lg lg:text-xl text-muted-foreground max-w-xl leading-relaxed"
          >
            TechEnsureX uses AI, fraud detection and a blockchain audit trail to make medical
            insurance instant, transparent and trustworthy — for patients, hospitals and insurers.
          </motion.p>

          <motion.div
            initial="hidden" animate="show" custom={3} variants={fadeUp}
            className="mt-9 flex flex-col sm:flex-row gap-3"
          >
            <Button asChild size="lg" className="group bg-gradient-primary hover:opacity-95 shadow-elevated h-13 px-7 text-base relative overflow-hidden">
              <Link to="/sign-up">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                Start free trial <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-13 px-7 text-base border-2 hover:bg-foreground hover:text-background transition-colors"
              onClick={() => setShowAuth(true)}
            >
              <PlayCircle className="w-4 h-4 mr-2" /> See live demo
            </Button>
          </motion.div>

          <motion.div
            initial="hidden" animate="show" custom={4} variants={fadeUp}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-muted-foreground"
          >
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> HIPAA-aligned</div>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <div className="flex items-center gap-2"><FileCheck2 className="w-4 h-4 text-secondary" /> Blockchain audited</div>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-accent" /> 99.4% AI accuracy</div>
          </motion.div>
        </div>

        {/* Right visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="relative lg:col-span-5"
        >
          {/* Gradient frame */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-vibrant rounded-[2rem] opacity-30 blur-2xl animate-pulse-glow" />
            <div className="relative rounded-3xl overflow-hidden shadow-elevated bg-card border border-white/60">
              <img src={heroImg} alt="TechEnsureX AI insurance dashboard" width={1536} height={1024} className="w-full h-auto" />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5" />
            </div>
          </div>

          {/* Floating: health score */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-6 top-12 glass-strong rounded-2xl p-4 shadow-elevated hidden sm:flex items-center gap-3 min-w-[180px]"
          >
            <div className="w-11 h-11 rounded-xl bg-accent/15 grid place-items-center">
              <HeartPulse className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Health score</p>
              <p className="font-display font-bold text-xl">92<span className="text-sm text-muted-foreground">/100</span></p>
            </div>
          </motion.div>

          {/* Floating: claim approved */}
          <motion.div
            animate={{ y: [0, 14, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            className="absolute -right-4 bottom-16 glass-strong rounded-2xl p-4 shadow-elevated hidden sm:flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
              <FileCheck2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Claim approved</p>
              <p className="font-display font-bold text-base">₹ 1,24,500</p>
            </div>
          </motion.div>

          {/* Floating: AI badge */}
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-4 right-8 glass-strong rounded-full p-3 shadow-elevated hidden md:block"
          >
            <Sparkles className="w-5 h-5 text-primary" />
          </motion.div>
        </motion.div>
      </div>

      {/* Trust marquee */}
      <div className="container relative mt-20">
        <p className="text-center text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-6">
          Trusted by 200+ insurers and hospitals
        </p>
        <div className="marquee">
          <div className="marquee-track">
            {[...Array(2)].flatMap((_, k) =>
              ["Apollo", "Fortis", "Max Healthcare", "Manipal", "Star Health", "HDFC Ergo", "ICICI Lombard", "Niva Bupa", "AIIMS", "Kokilaben"].map((n) => (
                <span key={`${k}-${n}`} className="font-display font-bold text-2xl text-muted-foreground/60 hover:text-foreground transition-colors whitespace-nowrap">
                  {n}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Auth Gate Modal */}
      <AuthGateModal open={showAuth} onClose={() => setShowAuth(false)} />
    </section>
  );
}
