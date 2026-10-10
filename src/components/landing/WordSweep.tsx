"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const SOLID = ["Build", "Pack", "Celebrate"];
const OUTLINE = ["Dress the room", "Split the bill", "Keep the friendship"];

function Row({ words, outline }: { words: string[]; outline?: boolean }) {
  // Repeat so the row never runs out while it slides.
  const items = [...words, ...words, ...words];
  return (
    <div className="flex shrink-0 items-center gap-[0.35em] whitespace-nowrap">
      {items.map((w, i) => (
        <span key={`${w}-${i}`} className="flex items-center gap-[0.35em]">
          <span
            className={
              outline
                ? "text-transparent [-webkit-text-stroke:1.5px_rgba(138,100,39,0.75)]"
                : "bg-gradient-to-b from-mist to-mist-muted bg-clip-text text-transparent"
            }
          >
            {w}
          </span>
          <span className="inline-block size-[0.16em] rotate-45 bg-celebration-gold shadow-[0_0_18px_rgba(138,100,39,0.8)]" aria-hidden />
        </span>
      ))}
    </div>
  );
}

/** Two giant rows that slide against each other as the section scrolls past. */
export function WordSweep() {
  const ref = useRef<HTMLElement>(null);
  const still = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const left = useTransform(scrollYProgress, [0, 1], ["0%", "-38%"]);
  const right = useTransform(scrollYProgress, [0, 1], ["-38%", "0%"]);

  return (
    <section ref={ref} aria-label="Build, pack, celebrate" className="relative overflow-hidden pt-28 pb-6 sm:pt-36">
      <h2 className="sr-only">Build. Pack. Celebrate.</h2>
      <div aria-hidden className="font-display text-[clamp(3.6rem,11vw,10.5rem)] leading-[0.95] font-semibold tracking-tight uppercase select-none">
        <motion.div style={{ x: still ? 0 : left }}>
          <Row words={SOLID} />
        </motion.div>
        <motion.div style={{ x: still ? "-20%" : right }} className="mt-2">
          <Row words={OUTLINE} outline />
        </motion.div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[12vw] bg-gradient-to-r from-dark-bg to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[12vw] bg-gradient-to-l from-dark-bg to-transparent" aria-hidden />
    </section>
  );
}
