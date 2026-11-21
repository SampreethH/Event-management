"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import Image from "next/image";

/**
 * Scattered polaroids that drop onto the table as the section enters view.
 * Real SKR Events photos — swap the files in /public/media/moments and the captions below to update.
 */
const MOMENTS: { src: string; alt: string; caption: string; rotate: number; x: string; y: string; w: string }[] = [
  { src: "/media/moments/m1-butterfly-balloons.webp", alt: "Lilac balloon décor with a light-up 10 and butterflies", caption: "Butterflies & balloons", rotate: -7, x: "2%", y: "6%", w: "24%" },
  { src: "/media/moments/m3-neon-backdrop.webp", alt: "Birthday girl in front of a gold sequin wall with a pink butterfly arch", caption: "Under the neon", rotate: 5, x: "24%", y: "0%", w: "19%" },
  { src: "/media/moments/m4-ganesha-mantapa.webp", alt: "Ganesha idol on a red-and-gold mantapa with floral garlands", caption: "Ganesha mantapa", rotate: -3, x: "44%", y: "9%", w: "23%" },
  { src: "/media/moments/m5-floating-florals.webp", alt: "Floating flower candles in brass bowls", caption: "Floating florals", rotate: 8, x: "70%", y: "2%", w: "25%" },
  { src: "/media/moments/m2-pink-drip-cake.webp", alt: "Pink drip birthday cake topped with a gold ice-cream cone", caption: "Make a wish", rotate: 4, x: "6%", y: "48%", w: "25%" },
  { src: "/media/moments/m6-rainbow-cake.webp", alt: "Two-tier pink rainbow cake against a sunset skyline", caption: "Rainbow layers", rotate: -6, x: "33%", y: "52%", w: "22%" },
  { src: "/media/moments/m7-dessert-table.webp", alt: "Garden-themed cake surrounded by rows of cupcakes", caption: "The dessert table", rotate: 6, x: "54%", y: "47%", w: "22%" },
  { src: "/media/moments/m8-sunset-cupcakes.webp", alt: "Pink themed cupcakes lined up on a balcony at sunset", caption: "Cupcakes at sunset", rotate: -4, x: "75%", y: "53%", w: "21%" },
];

const table: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };

export function MomentsCollage() {
  const still = useReducedMotion() ?? false;
  const drop: Variants = {
    hidden: (r: number) => (still ? { opacity: 0 } : { opacity: 0, y: -120, rotate: r * 3, scale: 1.15 }),
    show: (r: number) => ({
      opacity: 1,
      y: 0,
      rotate: r,
      scale: 1,
      transition: still ? { duration: 0.3 } : { type: "spring", stiffness: 140, damping: 16, mass: 0.9 },
    }),
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32">
      <header className="mx-auto max-w-2xl text-center">
        <p className="font-sub text-xs font-semibold tracking-[0.28em] text-celebration-gold/80 uppercase">The moments we pack for</p>
        <h2 className="mt-3 font-display text-4xl leading-[1.02] font-bold text-balance sm:text-5xl">Every box ends up in a photo like these.</h2>
      </header>

      {/* Desktop: scattered table. Mobile: a swipeable row of polaroids. */}
      <motion.ul
        variants={table}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-120px" }}
        className="relative mt-14 hidden aspect-[16/10] md:block"
      >
        {MOMENTS.map((m, i) => (
          <motion.li
            key={m.src}
            custom={m.rotate}
            variants={drop}
            whileHover={still ? undefined : { scale: 1.07, rotate: 0, zIndex: 30, transition: { duration: 0.25 } }}
            className="absolute cursor-zoom-in"
            style={{ left: m.x, top: m.y, width: m.w, zIndex: i % 2 ? 2 : 1 }}
          >
            <Polaroid m={m} />
          </motion.li>
        ))}
      </motion.ul>

      <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 md:hidden [scrollbar-width:none]">
        {MOMENTS.map((m) => (
          <li key={m.src} className="w-[68vw] max-w-[280px] shrink-0 snap-center" style={{ rotate: `${m.rotate / 2}deg` }}>
            <Polaroid m={m} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Polaroid({ m }: { m: (typeof MOMENTS)[number] }) {
  return (
    <figure className="rounded-[4px] bg-[#F6F1E7] p-[5%] pb-[4%] shadow-[0_26px_50px_-18px_rgba(0,0,0,0.85),0_2px_0_rgba(255,255,255,0.4)_inset]">
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-300">
        <Image src={m.src} alt={m.alt} fill sizes="(min-width:768px) 25vw, 70vw" className="object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.18),transparent_40%)]" />
      </div>
      <figcaption className="mt-[6%] text-center font-sub text-[clamp(0.7rem,1.05vw,0.95rem)] font-semibold tracking-wide text-[#3A3328]">{m.caption}</figcaption>
    </figure>
  );
}
