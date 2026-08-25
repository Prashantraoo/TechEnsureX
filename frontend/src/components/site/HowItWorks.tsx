import { useLayoutEffect, useRef } from "react";
import { Upload, Scan, ShieldCheck, Search, CheckCircle2, Wallet } from "lucide-react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { SplitHeadline } from "@/components/motion/SplitHeadline";

const steps = [
  { icon: Upload, title: "Upload documents", desc: "Drop bills, prescriptions and reports — any format." },
  { icon: Scan, title: "AI scans & extracts", desc: "OCR + medical NLP extracts every line item." },
  { icon: ShieldCheck, title: "Policy validation", desc: "Cross-checks coverage, limits, exclusions instantly." },
  { icon: Search, title: "Fraud detection", desc: "ML flags duplicates, anomalies and high-risk patterns." },
  { icon: CheckCircle2, title: "Approval prediction", desc: "Get probability and explainability before submission." },
  { icon: Wallet, title: "Settlement tracking", desc: "Verified payouts you can audit end-to-end." },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-step-card]", section);

      const ctx = gsap.context(() => {
        gsap.set(cards, { opacity: 0, y: 140, rotateX: -40, scale: 0.82, transformPerspective: 1200, transformOrigin: "50% 100%" });

        const scrollRange = { trigger: section, start: "top top+=80", end: "+=120%" };

        gsap.timeline({
          scrollTrigger: { ...scrollRange, scrub: 0.8, pin: true, anticipatePin: 1 },
        }).to(cards, {
          opacity: 1,
          y: 0,
          rotateX: 0,
          scale: 1,
          stagger: 0.16,
          ease: "power2.out",
        });

        gsap.fromTo(
          railRef.current,
          { scaleX: 0 },
          { scaleX: 1, ease: "none", scrollTrigger: { ...scrollRange, scrub: true } }
        );
      }, section);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, []);

  return (
    <section id="how" ref={sectionRef} className="relative py-28 lg:py-0 lg:min-h-screen lg:flex lg:items-center bg-muted/20 overflow-hidden">
      <div className="container relative w-full">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <SplitHeadline as="h2" by="lines" className="display-text text-4xl md:text-6xl font-extrabold">
            From upload to <span className="font-serif-italic font-normal text-primary">payout</span> in minutes.
          </SplitHeadline>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-px bg-border overflow-hidden">
            <div ref={railRef} className="h-full bg-gradient-primary origin-left" style={{ transform: "scaleX(0)" }} />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {steps.map((s, i) => (
              <div
                key={s.title}
                data-step-card
                className="relative bg-card border border-border/70 rounded-2xl p-5 shadow-soft hover:shadow-elevated hover:-translate-y-1 transition-shadow"
              >
                <div className="relative w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-primary grid place-items-center">
                  <s.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-primary mb-1">STEP {i + 1}</p>
                  <h3 className="font-semibold mb-2">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
