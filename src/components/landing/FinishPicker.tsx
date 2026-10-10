"use client";

import { motion } from "framer-motion";
import { FINISHES, FINISH_ORDER, type SleeveFinish } from "@/components/three/finishes";
import { useBoxBuilder } from "@/stores/box-builder";
import { cn } from "@/lib/cn";

/**
 * Sleeve swatches over the hero box. Re-skins the 3D box and preselects the same sleeve in the
 * builder, so "Design your box" opens with the look the visitor just chose.
 */
export function FinishPicker({ value, onChange }: { value: SleeveFinish; onChange: (f: SleeveFinish) => void }) {
  const setSleeve = useBoxBuilder((s) => s.setSleeve);

  const pick = (f: SleeveFinish) => {
    onChange(f);
    setSleeve(FINISHES[f].sleeveId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.4, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 lg:bottom-10 lg:left-auto lg:right-[12%] lg:translate-x-0"
    >
      <div
        role="radiogroup"
        aria-label="Box sleeve"
        className="flex items-center gap-3 rounded-full border border-white/12 bg-[#0B0C14]/70 py-2 pr-4 pl-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
      >
        <div className="flex items-center gap-1.5">
          {FINISH_ORDER.map((f) => {
            const active = f === value;
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={FINISHES[f].name}
                title={FINISHES[f].name}
                onClick={() => pick(f)}
                className={cn(
                  "relative grid size-9 place-items-center rounded-full transition-transform duration-300 hover:scale-110",
                  active && "scale-110",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="finish-ring"
                    className="absolute inset-0 rounded-full ring-2 ring-celebration-gold shadow-[0_0_18px_rgba(245,208,97,0.55)]"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="size-6 rounded-full ring-1 ring-white/25" style={{ background: FINISHES[f].swatch }} />
              </button>
            );
          })}
        </div>
        <div className="min-w-[7.5rem] leading-tight">
          <p className="font-sub text-[10px] font-semibold tracking-[0.22em] text-mist-faint uppercase">Sleeve</p>
          <motion.p key={value} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="font-display text-sm font-semibold text-mist">
            {FINISHES[value].name}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
