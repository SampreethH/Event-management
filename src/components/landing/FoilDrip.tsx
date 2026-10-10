"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

/**
 * Champagne-foil drip between the hero film and the rest of the page. The drips lengthen as the
 * divider scrolls through the viewport, like melted foil running down the page.
 */
const DRIPS: { x: number; w: number; len: number; delay: number }[] = [
  { x: 70, w: 34, len: 70, delay: 0.1 },
  { x: 190, w: 22, len: 118, delay: 0.32 },
  { x: 300, w: 46, len: 62, delay: 0.05 },
  { x: 430, w: 26, len: 150, delay: 0.22 },
  { x: 560, w: 38, len: 88, delay: 0.4 },
  { x: 700, w: 30, len: 170, delay: 0.15 },
  { x: 820, w: 44, len: 74, delay: 0.3 },
  { x: 950, w: 24, len: 128, delay: 0.08 },
  { x: 1070, w: 40, len: 96, delay: 0.36 },
  { x: 1200, w: 28, len: 156, delay: 0.18 },
  { x: 1330, w: 36, len: 66, delay: 0.26 },
];

const BAND = 22;

/** A rounded drip: neck from the band, swelling into a bead at the tip. */
function dripPath(x: number, w: number, len: number) {
  const half = w / 2;
  const neck = half * 0.55;
  const tip = BAND + len;
  return [
    `M ${x - half - 10} ${BAND - 1}`,
    `C ${x - half} ${BAND}, ${x - neck} ${BAND + 6}, ${x - neck} ${BAND + 18}`,
    `L ${x - neck} ${tip - half}`,
    `C ${x - neck} ${tip - half * 0.2}, ${x - half} ${tip - half * 0.5}, ${x - half} ${tip}`,
    `A ${half} ${half} 0 0 0 ${x + half} ${tip}`,
    `C ${x + half} ${tip - half * 0.5}, ${x + neck} ${tip - half * 0.2}, ${x + neck} ${tip - half}`,
    `L ${x + neck} ${BAND + 18}`,
    `C ${x + neck} ${BAND + 6}, ${x + half} ${BAND}, ${x + half + 10} ${BAND - 1}`,
    "Z",
  ].join(" ");
}

function Drip({ d, progress, delay, still }: { d: (typeof DRIPS)[number]; progress: MotionValue<number>; delay: number; still: boolean }) {
  const scaleY = useTransform(progress, [delay * 0.6, 0.55 + delay * 0.6], [0.12, 1], { clamp: true });
  return (
    <motion.path
      d={dripPath(d.x, d.w, d.len)}
      fill="url(#foil)"
      // Framer measures SVG transforms against the path's own box; originY 0 pins the drip to the band.
      style={{ scaleY: still ? 1 : scaleY, originX: 0.5, originY: 0 }}
    />
  );
}

export function FoilDrip() {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end 35%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.6 });

  return (
    <div ref={ref} aria-hidden className="pointer-events-none relative -mt-2 h-[clamp(120px,16vw,230px)] w-full overflow-hidden">
      <svg viewBox="0 0 1440 230" preserveAspectRatio="xMidYMin slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="foil" x1="0" x2="1" y1="0" y2="0.35">
            <stop offset="0" stopColor="#B88A2A" />
            <stop offset="0.22" stopColor="#F9E29A" />
            <stop offset="0.45" stopColor="#E7BE5C" />
            <stop offset="0.62" stopColor="#FFF4D0" />
            <stop offset="0.8" stopColor="#D9A93F" />
            <stop offset="1" stopColor="#A77B22" />
          </linearGradient>
          <linearGradient id="foil-sheen" x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="foil-clip">
            <rect x="0" y="0" width="1440" height={BAND} />
            {DRIPS.map((d) => (
              <path key={d.x} d={dripPath(d.x, d.w, d.len)} />
            ))}
          </clipPath>
        </defs>

        <rect x="0" y="0" width="1440" height={BAND} fill="url(#foil)" />
        {DRIPS.map((d) => (
          <Drip key={d.x} d={d} progress={progress} delay={d.delay} still={still} />
        ))}

        {/* A slow highlight sweeping across the foil. */}
        {!still && (
          <g clipPath="url(#foil-clip)">
            <motion.rect
              y="0"
              width="260"
              height="230"
              fill="url(#foil-sheen)"
              initial={{ x: -300 }}
              animate={{ x: 1500 }}
              transition={{ duration: 5.5, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
