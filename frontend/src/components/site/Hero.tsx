import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PlayCircle, ShieldCheck, Activity, FileCheck2, Zap, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gsap, EASE } from "@/lib/gsap";
import { SplitHeadline } from "@/components/motion/SplitHeadline";
import { ParallaxLayer } from "@/components/motion/ParallaxLayer";
import PhoneMockup from "@/components/ui/phone-mockups-1";
import AuthGateModal from "./AuthGateModal";

export default function Hero() {
  const [showAuth, setShowAuth] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: EASE } });
      tl.from("[data-hero-badge]", { opacity: 0, y: 16, duration: 0.6 })
        .from("[data-hero-headline]", { opacity: 0, y: 16, duration: 0.7 }, "-=0.35")
        .from("[data-hero-sub]", { opacity: 0, y: 16, duration: 0.7 }, "-=0.45")
        .from("[data-hero-cta] > *", { opacity: 0, y: 16, duration: 0.6, stagger: 0.1 }, "-=0.4")
        .from("[data-hero-trust] > *", { opacity: 0, x: -12, duration: 0.5, stagger: 0.08 }, "-=0.3")
        .from(
          "[data-hero-visual]",
          { opacity: 0, y: 32, scale: 0.96, duration: 0.9 },
          "-=0.7"
        )
        .from(
          "[data-hero-float]",
          { opacity: 0, scale: 0.9, duration: 0.5, stagger: 0.12 },
          "-=0.4"
        );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section id="product" ref={rootRef} className="relative pt-32 md:pt-40 pb-24 overflow-hidden bg-gradient-hero">
      {/* Two restrained ambient washes (blue + a hint of purple) — not
          stacked with grid/noise/mesh, and never more than these two. */}
      <ParallaxLayer speed={-0.15} className="absolute -top-40 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <ParallaxLayer speed={-0.08} className="absolute -bottom-32 -left-24 w-[440px] h-[440px] bg-[hsl(258_70%_60%/0.07)] rounded-full blur-[130px] pointer-events-none" />

      <div className="container relative grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* LEFT — the statement */}
        <div className="lg:col-span-6">
          <div
            data-hero-badge
            className="inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full glass-strong text-xs font-semibold shadow-soft"
          >
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-primary text-primary-foreground">
              <Zap className="w-3 h-3" /> NEW
            </span>
            <span className="text-foreground/80">AI Claim Engine v3 · Backed by IIT Bombay</span>
          </div>

          <div data-hero-headline>
            <SplitHeadline
              as="h1"
              by="lines"
              className="display-text mt-7 text-[2.75rem] sm:text-6xl lg:text-6xl xl:text-7xl font-extrabold text-foreground"
              delay={0.15}
            >
              Medical claims,{" "}
              <span className="text-primary">settled in minutes</span>{" "}
              <span className="font-serif-italic text-foreground/80 font-normal">not weeks.</span>
            </SplitHeadline>
          </div>

          <p
            data-hero-sub
            className="mt-7 text-lg lg:text-xl text-muted-foreground max-w-xl leading-relaxed"
          >
            TechEnsureX uses AI and fraud detection to make medical
            insurance instant, transparent and trustworthy — for patients, hospitals and insurers.
          </p>

          <div data-hero-cta className="mt-9 flex flex-col sm:flex-row sm:items-center gap-3">
            {/* GSAP animates these wrapper spans, not the Button/Link directly:
                the primary CTA's <Link> goes through Radix Slot, and animating
                that element's transform fights the Button's own
                transition-[...,transform] hover style, leaving it stuck
                mid-entrance (visible as a permanent vertical offset). A plain
                wrapper has no such conflict. */}
            <span className="inline-flex">
              <Button asChild size="lg" className="group bg-gradient-primary hover:opacity-95 shadow-elevated h-12 px-7 text-base">
                <Link to="/sign-up">
                  Start free trial <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </span>
            <span className="inline-flex">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-7 text-base border-2 hover:bg-foreground hover:text-background transition-colors"
                onClick={() => setShowAuth(true)}
              >
                <PlayCircle className="w-4 h-4 mr-2" /> See live demo
              </Button>
            </span>
          </div>

          <div
            data-hero-trust
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-muted-foreground"
          >
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> HIPAA-aligned</div>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <div className="flex items-center gap-2"><FileCheck2 className="w-4 h-4 text-secondary" /> Security audited</div>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-accent" /> 99.4% AI accuracy</div>
          </div>
        </div>

        {/* RIGHT — the product, anchored in a soft "device stage" backdrop so
            the column reads as visually rich rather than empty space around a
            small phone. The stage is purely decorative (behind, lower z-index);
            the floating callouts are positioned against the full-width column
            like the phone itself, so there's genuine clearance between them
            and the phone's screen — never layered on top of its content. */}
        <div data-hero-visual className="lg:col-span-6 relative flex justify-center items-center py-10 lg:py-0 min-h-[440px] sm:min-h-[500px] lg:min-h-[600px]">
          <div
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.12),transparent_65%)]"
            aria-hidden
          />
          <div
            className="absolute w-[300px] sm:w-[340px] aspect-[4/5] -z-10 rounded-[2.5rem] border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card/40 to-secondary/[0.08] backdrop-blur-sm"
            aria-hidden
          />

          <PhoneMockup />

          <div
            data-hero-float
            className="absolute left-0 top-10 sm:left-2 lg:left-0 glass-strong rounded-2xl p-4 shadow-elevated hidden sm:flex items-center gap-3 min-w-[168px]"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/15 grid place-items-center shrink-0">
              <HeartPulse className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Health score</p>
              <p className="font-display font-bold text-lg">92<span className="text-sm text-muted-foreground">/100</span></p>
            </div>
          </div>

          <div
            data-hero-float
            className="absolute right-0 bottom-12 sm:right-2 lg:right-0 glass-strong rounded-2xl p-4 shadow-elevated hidden sm:flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-primary grid place-items-center shrink-0">
              <FileCheck2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Claim approved</p>
              <p className="font-display font-bold text-base">₹ 1,24,500</p>
            </div>
          </div>
        </div>
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
