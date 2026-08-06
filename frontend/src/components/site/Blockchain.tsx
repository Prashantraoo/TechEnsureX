import { motion } from "framer-motion";
import { Link, Lock, Activity, ShieldCheck } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Immutable Records", desc: "Every medical report and claim is cryptographically secured." },
  { icon: Activity, title: "Smart Contracts", desc: "Automated payouts execute instantly once AI approves the claim." },
  { icon: Link, title: "Transparent Tracking", desc: "Real-time visibility for patients, hospitals, and insurers." },
  { icon: Lock, title: "Data Privacy", desc: "Decentralized architecture ensures patient data remains private and secure." },
];

export default function Blockchain() {
  return (
    <section id="blockchain" className="py-28 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7 }}
          >
            <span className="inline-block text-xs font-bold tracking-[0.25em] text-primary uppercase mb-4">◆ Decentralized Trust</span>
            <h2 className="display-text text-4xl md:text-5xl lg:text-6xl font-extrabold">
              Secured by <span className="font-serif-italic font-normal text-gradient-vibrant">Blockchain</span>
            </h2>
            <p className="mt-6 text-muted-foreground text-lg leading-relaxed">
              TechEnsureX utilizes a private blockchain network to create an unbreakable audit trail for every policy and claim. This eliminates fraud, builds absolute trust, and enables instant settlements through smart contracts.
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
            className="relative lg:h-[600px] rounded-[2.5rem] border border-border bg-gradient-card shadow-elevated p-8 overflow-hidden flex flex-col items-center justify-center group"
          >
             <div className="absolute inset-0 bg-grid opacity-20" />
             <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
             
             {/* Simple visualization of blocks */}
             <div className="relative w-full max-w-sm mx-auto space-y-6 z-10">
                {[1, 2, 3].map((block) => (
                  <motion.div
                    key={block}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + (block * 0.2) }}
                    className="relative bg-background border border-border rounded-2xl p-5 shadow-card hover:-translate-y-1 transition-transform duration-300 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                        <Link className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground font-mono mb-1">Block #{102030 + block}</div>
                        <div className="text-sm font-semibold text-foreground">
                          {block === 1 ? 'Claim Initiated' : block === 2 ? 'AI Verification Pass' : 'Smart Contract Payout'}
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
