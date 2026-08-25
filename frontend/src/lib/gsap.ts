import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

// Consistent, cinematic-but-not-sluggish easing used across the site.
export const EASE = "power3.out";
export const EASE_SOFT = "power2.out";

export { gsap, ScrollTrigger, SplitText };
