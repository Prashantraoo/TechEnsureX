import { motion } from "framer-motion";
import { Upload, Scan, ShieldCheck, Search, CheckCircle2, Wallet } from "lucide-react";

const steps = [
  { icon: Upload, title: "Upload documents", desc: "Drop bills, prescriptions and reports — any format." },
  { icon: Scan, title: "AI scans & extracts", desc: "OCR + medical NLP extracts every line item." },
  { icon: ShieldCheck, title: "Policy validation", desc: "Cross-checks coverage, limits, exclusions instantly." },
  { icon: Search, title: "Fraud detection", desc: "ML flags duplicates, anomalies and high-risk patterns." },
  { icon: CheckCircle2, title: "Approval prediction", desc: "Get probability and explainability before submission." },
  { icon: Wallet, title: "Settlement tracking", desc: "Blockchain-verified payouts you can audit end-to-end." },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-28 relative bg-muted/30">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block text-xs font-bold tracking-[0.25em] text-primary uppercase mb-4">◆ How it works</span>
          <h2 className="display-text text-4xl md:text-6xl font-extrabold">
            From upload to <span className="font-serif-italic font-normal text-gradient-vibrant">payout</span><br />in minutes.
          </h2>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative bg-card border border-border rounded-2xl p-5 shadow-soft hover:shadow-elevated hover:-translate-y-1 transition-all"
              >
                <div className="relative w-12 h-12 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-primary rounded-2xl shadow-glow animate-pulse-glow" />
                  <div className="relative w-full h-full grid place-items-center">
                    <s.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-primary mb-1">STEP {i + 1}</p>
                  <h3 className="font-semibold mb-2">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
