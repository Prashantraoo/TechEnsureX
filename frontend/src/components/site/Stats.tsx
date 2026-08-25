import { Counter } from "@/components/motion/Counter";
import { Reveal } from "@/components/motion/Reveal";

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
        <Reveal stagger={0.1} className="contents">
          {stats.map((s) => (
            <div key={s.l} className="text-center">
              <p className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                <Counter to={s.v} suffix={s.s} />
              </p>
              <p className="mt-2 text-sm md:text-base text-primary-foreground/80">{s.l}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
