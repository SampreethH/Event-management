"use client";

import type Lenis from "lenis";

/** The page's Lenis instance, or null when smooth scroll is off (reduced motion, SSR). */
let instance: Lenis | null = null;

export function getLenis(): Lenis | null {
  return instance;
}

export function setLenis(next: Lenis | null) {
  instance = next;
}

/** Scroll by a wheel delta: eased through Lenis when it's running, native otherwise. */
export function scrollByDelta(dy: number) {
  if (instance) instance.scrollTo(instance.targetScroll + dy);
  else window.scrollBy(0, dy);
}

/** Pause smooth scroll while an overlay is open, so the page underneath stays put. */
export function lockScroll(locked: boolean) {
  if (!instance) return;
  if (locked) instance.stop();
  else instance.start();
}
