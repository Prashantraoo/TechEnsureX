import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Basic", price: "₹499", period: "/month",
    desc: "For individuals getting started with smart claims.",
    features: ["Up to 5 claims/month", "AI document scanner", "Basic policy matching", "Email support"],
    highlight: false,
  },
  {
    name: "Professional", price: "₹1,499", period: "/month",
    desc: "Most popular for families and frequent users.",
    features: ["Unlimited claims", "Fraud detection AI", "Health risk reports", "Priority chat support", "Blockchain audit trail"],
    highlight: true,
  },
  {
    name: "Enterprise", price: "Custom", period: "",
    desc: "For hospitals, insurers and large healthcare networks.",
    features: ["Everything in Pro", "Admin dashboard & SSO", "API & webhook access", "Dedicated success manager", "On-prem deployment option"],
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-28">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block text-xs font-bold tracking-[0.25em] text-primary uppercase mb-4">◆ Pricing</span>
          <h2 className="display-text text-4xl md:text-6xl font-extrabold">
            Plans that <span className="font-serif-italic font-normal text-gradient-vibrant">scale with you.</span>
          </h2>
          <p className="mt-5 text-muted-foreground text-lg">Start free for 14 days. Cancel anytime. No credit card required.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-3xl p-7 transition-all ${
                p.highlight
                  ? "bg-gradient-primary text-primary-foreground shadow-elevated scale-105 border-0"
                  : "bg-card border border-border shadow-soft hover:shadow-card"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warning text-foreground text-xs font-bold px-3 py-1 rounded-full shadow-soft">
                  MOST POPULAR
                </div>
              )}
              <h3 className="font-display font-bold text-xl">{p.name}</h3>
              <p className={`text-sm mt-1 ${p.highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{p.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">{p.price}</span>
                <span className={p.highlight ? "text-primary-foreground/80" : "text-muted-foreground"}>{p.period}</span>
              </div>
              <Button asChild className={`w-full mt-6 ${p.highlight ? "bg-white text-primary hover:bg-white/90" : "bg-gradient-primary"}`}>
                <Link to="/sign-up">Start free trial</Link>
              </Button>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${p.highlight ? "text-primary-foreground" : "text-accent"}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
