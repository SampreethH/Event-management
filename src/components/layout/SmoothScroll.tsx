"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { setLenis } from "@/lib/client/smooth-scroll";

/**
 * Eased wheel and keyboard scrolling via Lenis. It drives native window scroll,
 * so sticky sections, IntersectionObservers and scroll listeners keep working.
 * Touch keeps native momentum (syncTouch off), and reduced-motion visitors get
 * plain browser scrolling.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      anchors: { offset: -112 },
      lerp: 0.1,
      // Nested scroll areas (rails, menus) scroll natively.
      allowNestedScroll: true,
      // 3D canvases own their wheel (OrbitControls zoom calls preventDefault, which
      // Lenis doesn't check), so leave them to the browser.
      prevent: (node) => node instanceof HTMLCanvasElement,
    });
    setLenis(lenis);
    return () => {
      setLenis(null);
      lenis.destroy();
    };
  }, []);
  return null;
}
