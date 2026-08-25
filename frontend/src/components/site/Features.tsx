import { motion } from "framer-motion";
import {
  Brain, Sparkles, ShieldAlert, Gauge, Calculator, HeartPulse,
  FileSearch, FileScan, MessageSquare, ListChecks, ArrowUpRight
} from "lucide-react";

const features = [
  { icon: Brain, title: "AI Claim Analyzer", desc: "Reads, validates and scores every claim in seconds with explainable AI.", featured: true },
  { icon: ShieldAlert, title: "Fraud Detection", desc: "Spots anomalies and duplicate claims before they're paid out." },
  { icon: Sparkles, title: "Smart Matching", desc: "Recommends the best policy based on health and budget." },
  { icon: Gauge, title: "Instant Prediction", desc: "Approval probability and payout window upfront." },
  { icon: Calculator, title: "Cost Estimator", desc: "Estimate procedure costs across hospitals." },
  { icon: HeartPulse, title: "Risk Assessment", desc: "AI scans reports to flag chronic risks." },
  { icon: FileSearch, title: "Policy Recommender", desc: "Compare 200+ plans tailored to your history." },
  { icon: FileScan, title: "Document Scanner", desc: "OCR + AI extracts data from prescriptions." },
  { icon: MessageSquare, title: "AI Assistant", desc: "24/7 chatbot for claims and coverage." },
  { icon: ListChecks, title: "Claim Tracking", desc: "Real-time claim status updates." },
];

export default function Features() {
  return (
    <section id="features" className="py-28 relative overflow-hidden">
      <div className="container relative">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="display-text text-4xl md:text-6xl font-extrabold"
          >
            One platform.<br />
            <span className="font-serif-italic font-normal text-muted-foreground">Every claim moment.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-muted-foreground text-lg max-w-2xl mx-auto"
          >
            A complete AI suite covering policy discovery, claims, fraud, payouts and patient experience.
          </motion.p>
        </div>

        {/* Bento grid — rows are content-sized (no fixed total height), so the
            featured tile's text can never get clipped, and the 9 remaining
            tiles (which don't divide evenly into the featured tile's leftover
            cells) simply flow onto as many rows as they need instead of
            overflowing a hard-capped container. */}
        <div className="grid lg:grid-cols-4 gap-4">
          {/* Featured tile */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            whileHover={{ y: -4 }}
            className="lg:col-span-2 lg:row-span-2 min-h-[420px] relative rounded-3xl bg-foreground text-background p-8 lg:p-10 overflow-hidden group cursor-pointer"
          >
            <div className="relative h-full flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 grid place-items-center mb-6">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h3 className="display-text text-3xl lg:text-4xl font-bold leading-tight">
                AI Claim Analyzer
              </h3>
              <p className="mt-4 text-white/85 text-base lg:text-lg max-w-sm leading-relaxed">
                Our explainable AI reads every line of every claim — extracts entities, validates against policy rules, and predicts approval in under 12 seconds.
              </p>
              <div className="mt-auto pt-8 flex items-center justify-between">
                <div className="flex items-center gap-4 text-white/70 text-xs font-mono">
                  <span>99.4% accuracy</span>
                  <span>·</span>
                  <span>12s decision</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/15 grid place-items-center group-hover:bg-white group-hover:text-primary transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </motion.div>

          {features.slice(1).map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.05 + (i % 4) * 0.05 }}
              whileHover={{ y: -4 }}
              className="group relative bg-gradient-card border border-border/70 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-primary scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/8 grid place-items-center group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all">
                  <f.icon className="w-4.5 h-4.5 text-primary group-hover:text-primary-foreground" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-display font-semibold text-base">{f.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
