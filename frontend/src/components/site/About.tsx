import { motion } from "framer-motion";
import { Building2, Microscope, ShieldCheck, Award } from "lucide-react";

export default function About() {
  return (
    <section id="about" className="py-28 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      <div className="container relative grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }}
        >
          <span className="inline-block text-xs font-bold tracking-[0.25em] text-primary uppercase mb-4">◆ About TechEnsureX</span>
          <h2 className="display-text text-4xl md:text-5xl lg:text-6xl font-extrabold">
            Reimagining healthcare insurance for <span className="font-serif-italic font-normal text-gradient-vibrant">a billion lives</span>
          </h2>
          <p className="mt-6 text-muted-foreground text-lg leading-relaxed">
            We're an IIT Bombay–incubated startup digitizing every step of the medical insurance
            journey — from policy discovery to claim payout. Our AI engine, paired with a blockchain
            audit trail, gives patients, hospitals and insurers a single source of truth.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { icon: Building2, label: "IIT Bombay incubated" },
              { icon: Microscope, label: "Healthcare-first AI" },
              { icon: ShieldCheck, label: "Blockchain audited" },
              { icon: Award, label: "Trusted by 50+ hospitals" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border shadow-soft">
                <div className="w-10 h-10 rounded-lg bg-gradient-primary/10 grid place-items-center">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="grid grid-cols-2 gap-4">
            {[
              { v: "₹4.2 Cr", l: "Avg monthly payouts", c: "from-primary to-primary-glow" },
              { v: "12 sec", l: "Avg claim decision", c: "from-secondary to-accent" },
              { v: "99.4%", l: "AI accuracy", c: "from-accent to-secondary" },
              { v: "200+", l: "Insurance partners", c: "from-primary-glow to-primary" },
            ].map((s, i) => (
              <motion.div
                key={s.l}
                whileHover={{ y: -4 }}
                className="relative bg-card border border-border rounded-2xl p-6 shadow-card overflow-hidden"
                style={{ marginTop: i % 2 ? "2rem" : 0 }}
              >
                <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${s.c} opacity-20 blur-2xl`} />
                <p className="font-display text-3xl font-bold text-gradient-primary">{s.v}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.l}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
