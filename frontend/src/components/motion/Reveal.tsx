import { useLayoutEffect, useRef, ElementType, ReactNode } from "react";
import { gsap, ScrollTrigger, EASE } from "@/lib/gsap";

interface RevealProps {
  children: ReactNode;
  className?: string;
  y?: number;
  x?: number;
  scale?: number;
  delay?: number;
  duration?: number;
  /** If set, animates each direct child individually with this stagger (seconds). */
  stagger?: number;
  start?: string;
  once?: boolean;
  as?: ElementType;
}

// Scroll-triggered reveal (fade + slide/scale in). Drop-in replacement for the
// framer-motion `whileInView` pattern used across the marketing site, backed
// by GSAP ScrollTrigger so every reveal shares one scroll-driven timeline.
export function Reveal({
  children,
  className,
  y = 28,
  x = 0,
  scale = 1,
  delay = 0,
  duration = 0.9,
  stagger,
  start = "top 85%",
  once = true,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const targets: gsap.TweenTarget = stagger ? Array.from(el.children) : el;
      gsap.set(targets, { opacity: 0, y, x, scale });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        duration,
        delay,
        stagger,
        ease: EASE,
        scrollTrigger: {
          trigger: el,
          start,
          toggleActions: once ? "play none none none" : "play none none reverse",
        },
      });
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Comp = Tag as ElementType;
  return (
    <Comp ref={ref} className={className}>
      {children}
    </Comp>
  );
}
