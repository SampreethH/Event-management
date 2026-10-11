"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * Pointer-driven flourishes: a magnetic pull for CTAs and a 3D tilt for cards.
 * Spread the returned handlers onto an element. They write `transform` straight to
 * `event.currentTarget` (no React state per frame), only run for a mouse, and stay
 * off for reduced-motion visitors. Easing comes from the element's own transition
 * (give it transition-all or transition-transform), so its colour and shadow
 * transitions are left alone. Tailwind v4 translate/scale utilities use their own
 * CSS properties, so hover lifts compose with these transforms.
 */

type Handlers = {
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave: (e: ReactPointerEvent<HTMLElement>) => void;
};

function enabled(e: ReactPointerEvent) {
  return e.pointerType === "mouse" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Current magnetic pull per element, subtracted when measuring so the rest position stays the reference. */
const pull = new WeakMap<Element, { x: number; y: number }>();

function reset(e: ReactPointerEvent<HTMLElement>) {
  pull.delete(e.currentTarget);
  e.currentTarget.style.transform = "";
}

/** Leans the element toward the cursor by `strength` of the offset from its centre. */
export function magnetic(strength = 0.28): Handlers {
  return {
    onPointerMove(e) {
      if (!strength || !enabled(e)) return;
      const node = e.currentTarget;
      const r = node.getBoundingClientRect();
      const prev = pull.get(node) ?? { x: 0, y: 0 };
      const x = (e.clientX - (r.left + r.width / 2 - prev.x)) * strength;
      const y = (e.clientY - (r.top + r.height / 2 - prev.y)) * strength;
      pull.set(node, { x, y });
      node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    },
    onPointerLeave: reset,
  };
}

/** Tilts the element in 3D toward the cursor, up to `max` degrees. */
export function tilt(max = 6): Handlers {
  return {
    onPointerMove(e) {
      if (!enabled(e)) return;
      const node = e.currentTarget;
      const r = node.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      node.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
    },
    onPointerLeave: reset,
  };
}
