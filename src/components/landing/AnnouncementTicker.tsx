"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Leaf } from "lucide-react";

const MESSAGE = "Designed by you in 3D, delivered on your slot, or in 90 minutes when the party can’t wait.";

/**
 * Dark announcement strip with champagne lettering. Centred and static on
 * wider screens; on phones, where the line can't fit, it scrolls as a seamless marquee.
 */
export function AnnouncementTicker() {
  const reduce = useReducedMotion();
  const line = (key: number) => (
    <span key={key} className="flex shrink-0 items-center gap-2 px-8" aria-hidden={key > 0}>
      <Leaf className="size-3.5 shrink-0" aria-hidden />
      {MESSAGE}
    </span>
  );
  const text = "font-sub text-[11px] font-medium tracking-[0.1em] uppercase text-[#E9D9A6] sm:text-xs";

  return (
    <div className="relative h-8 overflow-hidden border-b border-ink/[0.06] bg-ink backdrop-blur-md" role="region" aria-label="Announcement">
      {/* md+: centred static line with a gentle float */}
      <motion.p
        className={`hidden h-full items-center justify-center md:flex ${text}`}
        animate={reduce ? undefined : { y: [0, -1, 0, 1, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Leaf className="mr-2 size-3.5" aria-hidden />
        {MESSAGE}
      </motion.p>
      {/* phones: marquee */}
      {reduce ? (
        <p className={`flex h-full items-center justify-center truncate px-4 md:hidden ${text}`}>{MESSAGE}</p>
      ) : (
        <motion.div
          className={`flex h-full w-max items-center whitespace-nowrap md:hidden ${text}`}
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, ease: "linear", repeat: Infinity }}
        >
          {[0, 1, 2, 3].map(line)}
        </motion.div>
      )}
    </div>
  );
}
