/**
 * GSAP Plugin Registration — import this once at app level
 * to make ScrollTrigger (and future plugins) available everywhere.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Global GSAP defaults for the brutalist aesthetic
gsap.defaults({
  ease: "power4.out",
  duration: 1.2,
});

export { gsap, ScrollTrigger };

