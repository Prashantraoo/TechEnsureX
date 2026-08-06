import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { useEffect, useRef } from "react";

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const mv = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, {
      duration: 1.8, ease: "easeOut",
      onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString() + suffix; },
    });
    return () => controls.stop();
  }, [inView, to, suffix, mv]);

  return <span ref={ref}>0{suffix}</span>;
}

const stats = [
  { v: 248000, s: "+", l: "Claims processed" },
  { v: 95000, s: "+", l: "Customers protected" },
  { v: 99, s: "%", l: "AI accuracy" },
  { v: 200, s: "+", l: "Insurance partners" },
];

export default function Stats() {
  return (
    <section className="py-20 bg-gradient-primary relative overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, white 0%, transparent 40%), radial-gradient(circle at 70% 80%, white 0%, transparent 40%)" }} />
      <div className="container relative grid grid-cols-2 lg:grid-cols-4 gap-8 text-primary-foreground">
        {stats.map((s, i) => (
          <motion.div
            key={s.l}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
            className="text-center"
          >
            <p className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              <Counter to={s.v} suffix={s.s} />
            </p>
            <p className="mt-2 text-sm md:text-base text-primary-foreground/80">{s.l}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
