import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, ShieldCheck, Link2, Lock, Zap } from "lucide-react";

const EASE = [0.23, 1, 0.32, 1] as const;

const benefits = [
  { icon: Zap, title: "Instant Claim Analysis", copy: "AI evaluates and processes your claims in seconds." },
  { icon: Link2, title: "Secure Verification", copy: "Every claim is verified through advanced security protocols." },
  { icon: Lock, title: "Your Data, Always Safe", copy: "HIPAA-compliant. Encrypted. Private." },
];

/**
 * Editorial brand/value-proposition panel shared by sign-in and sign-up.
 * Purely presentational. Deliberately spacious — a headline, one line of
 * copy, three minimal benefit rows, and a single ambient illustration,
 * never a stack of marketing cards or a bordered "feature grid".
 */
export function BrandPanel() {
  return (
    <div className="relative flex flex-col justify-center px-8 sm:px-14 lg:px-20 py-10 lg:pt-[46px] lg:pb-[12px]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative max-w-lg mx-auto lg:mx-0 w-full"
      >
        <Link to="/" className="flex w-fit items-center gap-2.5 group">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-primary shadow-soft grid place-items-center transition-transform duration-300 group-hover:scale-105">
            <Shield className="w-[18px] h-[18px] text-primary-foreground" />
          </div>
          <span className="font-display font-extrabold text-lg leading-none tracking-tight text-foreground">
            Tech<span className="text-primary">EnsureX</span>
          </span>
        </Link>

        <span className="mt-4 flex w-fit items-center gap-2 pl-2.5 pr-3.5 py-1.5 rounded-full bg-primary/[0.06] border border-primary/15 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          <ShieldCheck className="w-3 h-3 shrink-0" />
          AI-Powered &middot; Secure &middot; HIPAA Compliant
        </span>

        <h1 className="mt-8 font-display text-[2.75rem] sm:text-5xl font-bold tracking-tight text-foreground leading-[1.05]">
          Smarter insurance.
          <br />
          <span className="font-editorial-italic text-primary">Faster settlements.</span>
        </h1>

        <p className="mt-5 text-[15px] text-muted-foreground leading-relaxed max-w-md">
          AI-driven claim analysis, fraud detection and secure verification to deliver instant, transparent and trustworthy health insurance.
        </p>

        <div className="mt-6 space-y-4">
          {benefits.map((b) => (
            <div key={b.title} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/[0.08] text-primary grid place-items-center shrink-0 mt-0.5">
                <b.icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{b.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{b.copy}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden lg:block mt-5 -ml-4">
          <SecurityVisual />
        </div>
      </motion.div>
    </div>
  );
}

const NODES = [
  { x: 42, y: 28 },
  { x: 300, y: 34 },
  { x: 22, y: 140 },
  { x: 318, y: 148 },
  { x: 96, y: 214 },
  { x: 248, y: 210 },
] as const;

const CX = 170;
const CY = 148;
// A simple, symmetric shield outline (viewBox-local 0..60 x 0..68),
// positioned via the translate below rather than baked into world coords.
const SHIELD_PATH = "M30 2 L54 13 V32 C54 50 43 62 30 68 C17 62 6 50 6 32 V13 Z";

/**
 * Ambient healthcare/security visual — a translucent shield glowing
 * softly at the center of a faint, low-contrast web of connection points.
 * Deliberately built from gradients, blur and thin strokes rather than
 * bordered icon chips, so it reads as atmosphere/infrastructure rather
 * than a component diagram or clipart.
 */
function SecurityVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="relative h-[110px] w-full max-w-md">
      <svg viewBox="0 0 340 240" className="absolute inset-0 w-full h-full overflow-visible">
        <defs>
          <radialGradient id="authShieldGlow" cx="50%" cy="46%" r="55%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="authShieldFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.20" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {NODES.map((n, i) => (
          <line key={i} x1={CX} y1={CY} x2={n.x} y2={n.y} stroke="hsl(var(--primary) / 0.10)" strokeWidth="1" strokeDasharray="1.5 5" strokeLinecap="round" />
        ))}

        <circle cx={CX} cy={CY} r="58" fill="none" stroke="hsl(var(--primary) / 0.08)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r="82" fill="none" stroke="hsl(var(--primary) / 0.05)" strokeWidth="1" />

        <circle cx={CX} cy={CY} r="70" fill="url(#authShieldGlow)" />

        <motion.g
          transform={`translate(${CX - 30}, ${CY - 40})`}
          animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d={SHIELD_PATH} fill="url(#authShieldFill)" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.25" />
          <path d="M18 33 L27 42 L43 22" fill="none" stroke="hsl(var(--primary) / 0.55)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>

        {NODES.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r="3" fill="hsl(var(--primary) / 0.32)" />
        ))}
      </svg>
    </div>
  );
}
