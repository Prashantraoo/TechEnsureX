import { useLayoutEffect, useRef, ElementType, ReactNode } from "react";
import { gsap, SplitText, EASE } from "@/lib/gsap";

interface SplitHeadlineProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  by?: "words" | "chars" | "lines";
  delay?: number;
  start?: string;
}

// Cinematic headline reveal: splits text into lines/words and animates them
// up out of a masked (overflow-hidden) line as the section scrolls into view.
export function SplitHeadline({
  children,
  className,
  as: Tag = "h2",
  by = "words",
  delay = 0,
  start = "top 85%",
}: SplitHeadlineProps) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let split: SplitText | null = null;
    const ctx = gsap.context(() => {
      split = new SplitText(el, {
        type: by === "lines" ? "lines" : "lines,words",
        linesClass: "split-line",
      });
      const targets = by === "lines" ? split.lines : split.words;

      gsap.set(targets, { yPercent: 115, opacity: 0 });
      gsap.to(targets, {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        delay,
        stagger: by === "lines" ? 0.08 : 0.018,
        ease: EASE,
        scrollTrigger: {
          trigger: el,
          start,
          toggleActions: "play none none none",
        },
      });
    }, el);

    return () => {
      ctx.revert();
      split?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Comp = Tag as ElementType;
  return (
    <Comp ref={ref} className={className}>
      {children}
    </Comp>
  );
}
