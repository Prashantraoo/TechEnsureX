import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Wifi, BatteryFull, SignalHigh, Menu, Bell, Home, FileCheck2, Activity, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE_OUT_STRONG = [0.23, 1, 0.32, 1] as const;

const TAB_ITEMS = [
  { icon: Home, label: "Dashboard" },
  { icon: FileCheck2, label: "Claims" },
  { icon: Activity, label: "AI Report" },
  { icon: Shield, label: "Plans" },
  { icon: User, label: "Profile" },
] as const;

export interface PhoneSlide {
  id: string;
  /** App bar title, e.g. "Plans". */
  title: string;
  /** Which bottom tab reads as active while this slide is showing. */
  activeTab: number;
  /** The screen body — real markup (cards, lists, stats), not a screenshot,
   * so it always fills the screen exactly instead of needing to be cropped
   * or padded to fit. */
  body: ReactNode;
}

interface PhoneCarouselProps {
  slides: PhoneSlide[];
  /** ms between automatic slide changes. Set 0 to disable autoplay. */
  autoPlayInterval?: number;
  className?: string;
}

/**
 * PhoneFrame — the bezel. Width is the only sized dimension; height always
 * comes from the aspect-ratio on PhoneScreen below it, so there is never an
 * arbitrary fixed/huge height to fight with.
 */
function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-[260px] sm:w-[300px] lg:w-[320px] rounded-[2.75rem] border-[6px] border-foreground/90 bg-foreground/90 shadow-elevated">
      {/* Dynamic island */}
      <div className="absolute left-1/2 top-3 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-foreground/90" />
      {children}
      {/* Home indicator */}
      <div className="absolute bottom-1.5 left-1/2 z-10 h-1 w-24 -translate-x-1/2 rounded-full bg-foreground/30" />
    </div>
  );
}

/**
 * PhoneScreen — a real phone aspect-ratio (so height always derives from
 * width, never a fixed px value), clipped so PhoneScreenContent can never
 * spill past the bezel.
 */
function PhoneScreen({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex aspect-[9/19.5] w-full flex-col overflow-hidden rounded-[2.25rem] bg-card">
      {children}
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex shrink-0 items-center justify-between px-6 pt-3 pb-1 text-[10px] font-semibold text-foreground">
      <span>9:41</span>
      <div className="flex items-center gap-1">
        <SignalHigh className="h-3 w-3" />
        <Wifi className="h-3 w-3" />
        <BatteryFull className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function AppHeader({ title }: { title: string }) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2.5">
      <Menu className="h-4 w-4 text-foreground/70" />
      <span className="font-display text-[13px] font-bold text-foreground">{title}</span>
      <div className="relative">
        <Bell className="h-4 w-4 text-foreground/70" />
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
      </div>
    </div>
  );
}

function BottomTabBar({ active }: { active: number }) {
  return (
    <div className="grid shrink-0 grid-cols-5 border-t border-border/60 py-2">
      {TAB_ITEMS.map((tab, i) => (
        <div key={tab.label} className="flex flex-col items-center gap-0.5">
          <tab.icon className={cn("h-3.5 w-3.5", i === active ? "text-primary" : "text-muted-foreground/50")} />
          <span className={cn("text-[7px] font-medium", i === active ? "text-primary" : "text-muted-foreground/50")}>
            {tab.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * A realistic phone frame that cycles through TechEnsureX product screens.
 * Built entirely from TechEnsureX's own tokens (shadow-elevated/shadow-glow,
 * primary, radius scale) rather than lifted screenshots — the bezel, status
 * bar, app chrome and screen bodies are all plain markup so the frame always
 * matches the current theme and fills edge to edge at any size.
 */
export function PhoneCarousel({ slides, autoPlayInterval = 4200, className }: PhoneCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!autoPlayInterval || paused || slides.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), autoPlayInterval);
    return () => clearInterval(id);
  }, [autoPlayInterval, paused, slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[index];

  return (
    <div
      className={cn("relative select-none", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Idle float — slow and tiny; a hero visual seen once per visit, not a
          control seen hundreds of times a day, so a little life is earned.
          Disabled entirely under prefers-reduced-motion. */}
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <PhoneFrame>
          <PhoneScreen>
            <StatusBar />
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT_STRONG } }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE_OUT_STRONG } }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <AppHeader title={slide.title} />
                <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">{slide.body}</div>
              </motion.div>
            </AnimatePresence>
            <BottomTabBar active={slide.activeTab} />
          </PhoneScreen>
        </PhoneFrame>
      </motion.div>

      {/* Slide indicators — real controls, not decoration: keyboard-operable, paused on focus. */}
      {slides.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${s.title}`}
              aria-current={i === index}
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-200 ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/40",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
