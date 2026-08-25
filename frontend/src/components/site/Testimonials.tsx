import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const items = [
  { name: "Dr. Anjali Sharma", role: "Cardiologist · Apollo", quote: "TechEnsureX cut our claim turnaround from 14 days to under 24 hours. The AI flags issues we'd usually miss." },
  { name: "Rohan Mehta", role: "Patient", quote: "Uploaded my hospital bills, got predicted approval in seconds, and the payout hit my account the same week." },
  { name: "Priya Iyer", role: "VP Claims · Star Health", quote: "Fraud detection saved us ₹2.1 Cr last quarter. The audit trail is a regulator's dream." },
  { name: "Karan Gupta", role: "Hospital Admin", quote: "The AI assistant handles 70% of patient insurance queries. Our front desk finally has time to focus on care." },
];

export default function Testimonials() {
  return (
    <section className="py-28 bg-muted/30">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="display-text text-4xl md:text-6xl font-extrabold">
            Trusted across <span className="font-serif-italic font-normal text-primary">hospitals & insurers.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className="bg-card border border-border/70 rounded-2xl p-6 shadow-soft hover:shadow-elevated transition-all relative"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-warning text-warning" />)}
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">"{t.quote}"</p>
              <div className="mt-5 pt-4 border-t border-border">
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
