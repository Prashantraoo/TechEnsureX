import { motion } from "framer-motion";
import { Link, Lock, Activity, ShieldCheck } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Encrypted Records", desc: "Every medical report and claim is encrypted at rest and in transit." },
  { icon: Activity, title: "Automated Verification", desc: "AI-assisted checks flag issues before a claim reaches a reviewer." },
  { icon: Link, title: "Full Audit Trail", desc: "Every claim gets a unique, verifiable audit ID from submission to payout." },
  { icon: Lock, title: "Data Privacy", desc: "Access-controlled architecture keeps patient data private and secure." },
];

export default function Security() {
  return (
    <section id="security" className="py-28 relative overflow-hidden">
      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7 }}
          >
            <h2 className="display-text text-4xl md:text-5xl lg:text-6xl font-extrabold">
              Secured by <span className="font-serif-italic font-normal text-primary">design</span>
            </h2>
            <p className="mt-6 text-muted-foreground text-lg leading-relaxed">
              TechEnsureX encrypts every policy and claim and keeps a verifiable audit trail from submission to payout. This eliminates fraud, builds trust, and keeps settlements fast and transparent.
            </p>

            <div className="mt-10 space-y-4">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex gap-4 p-4 rounded-2xl hover:bg-card hover:shadow-soft border border-transparent hover:border-border transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 grid place-items-center shrink-0 group-hover:bg-primary transition-colors">
                    <f.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{f.title}</h3>
                    <p className="text-muted-foreground mt-1">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="relative lg:h-[600px] rounded-[2.5rem] border border-border/70 bg-gradient-card shadow-elevated p-8 overflow-hidden flex flex-col items-center justify-center"
          >
             {/* Simple visualization of the claim audit trail */}
             <div className="relative w-full max-w-sm mx-auto space-y-6 z-10">
                {[1, 2, 3].map((step) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + (step * 0.2) }}
                    className="relative bg-background border border-border/70 rounded-2xl p-5 shadow-card hover:-translate-y-1 transition-transform duration-300 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                        <Link className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground font-mono mb-1">Ref #{102030 + step}</div>
                        <div className="text-sm font-semibold text-foreground">
                          {step === 1 ? 'Claim Initiated' : step === 2 ? 'AI Verification Pass' : 'Payout Confirmed'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20 font-medium tracking-wide">
                      Verified
                    </div>
                  </motion.div>
                ))}

                {/* Connecting line */}
                <div className="absolute top-[2rem] bottom-[2rem] left-[2.25rem] w-0.5 bg-gradient-to-b from-primary/10 via-primary/50 to-primary/10 -z-10" />
             </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
