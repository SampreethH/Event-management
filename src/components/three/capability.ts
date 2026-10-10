"use client";

/** Render tier for 3D scenes, decided once per page load. */
export type Quality = "high" | "low" | "static";

let cached: Quality | undefined;

export function detectQuality(): Quality {
  if (cached) return cached;
  cached = probe();
  return cached;
}

function probe(): Quality {
  if (typeof window === "undefined") return "static";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "static";

  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  if (!gl) return "static";

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return "static";
  const memory = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  if (memory <= 2 || cores <= 2) return "static";

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse || memory <= 4 || cores <= 4) return "low";
  return "high";
}

/** Stable subscribe for useSyncExternalStore — quality never changes after load. */
export const subscribeNoop = () => () => {};

/** Small seeded PRNG so scene layouts are deterministic and render-pure. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
