import { useLayoutEffect, useRef, ReactNode, CSSProperties } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface ParallaxLayerProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** -1..1— negative drifts up as you scroll down, positive drifts down. */
  speed?: number;
}

export function ParallaxLayer({ children, className, style, speed = 0.3 }: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const trigger = el?.parentElement;
    if (!el || !trigger) return;

    const ctx = gsap.context(() => {
      gsap.to(el, {
        yPercent: speed * 100,
        ease: "none",
        scrollTrigger: {
          trigger,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
