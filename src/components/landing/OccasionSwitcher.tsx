"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Briefcase, Cake, Home, Baby, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useBoxBuilder } from "@/stores/box-builder";
import { cn } from "@/lib/cn";

interface Occasion {
  id: string;
  tab: string;
  Icon: LucideIcon;
  title: string;
  body: string;
  /** Catalog-backed suggestions; ids map to `lib/domain/catalog.ts`. */
  picks: string[];
  sleeveId: string;
  /** rgb triplet for the section glow. */
  glow: string;
  image: string;
  alt: string;
}

const OCCASIONS: Occasion[] = [
  {
    id: "birthday",
    tab: "Birthdays",
    Icon: Cake,
    title: "Balloons up, candles lit.",
    body: "Chips, samosa and a cream bun, an eggless cake slice for every guest, and return gifts the kids actually want.",
    picks: ["Red box", "Plain vanilla cake", "Channapatna wooden toy"],
    sleeveId: "sleeve-red",
    glow: "255,94,91",
    image: "/media/occasions/birthday.webp",
    alt: "Pink and white balloon arch around a birthday cake table with a neon sign",
  },
  {
    id: "baby-shower",
    tab: "Baby showers",
    Icon: Baby,
    title: "Soft colours, sweet tables.",
    body: "Soft pink boxes, sweets labelled for the elders at the table, and seed pencils that grow after the day.",
    picks: ["Pink box", "Mysore pak", "Plantable seed pencils"],
    sleeveId: "sleeve-pink",
    glow: "167,139,250",
    image: "/media/occasions/baby-shower.webp",
    alt: "Light-up BABY marquee letters with pastel balloon garlands",
  },
  {
    id: "corporate",
    tab: "Corporate",
    Icon: Briefcase,
    title: "Launches, offsites, wins.",
    body: "Monogrammed sleeves in bulk, a toast-ready spread, and one link so each team pays its share. Bulk tiers up to 20% off.",
    picks: ["Black & gold box", "Kaju katli", "Printed jute bag"],
    sleeveId: "sleeve-black",
    glow: "245,208,97",
    image: "/media/occasions/corporate.webp",
    alt: "Colleagues raising wine glasses in a toast",
  },
  {
    id: "housewarming",
    tab: "Housewarmings",
    Icon: Home,
    title: "New keys, full table.",
    body: "Kachori, khara mixture and honey cake for the new kitchen, and steel bottles that stay after the guests leave.",
    picks: ["Kraft brown box", "Honey cake", "Steel water bottle"],
    sleeveId: "sleeve-kraft",
    glow: "16,185,129",
    image: "/media/occasions/housewarming.webp",
    alt: "Friends sharing drinks around a grazing table scattered with confetti",
  },
];

/** Tabs that re-dress the section — photo, copy, suggested box and glow — per occasion. */
export function OccasionSwitcher() {
  const [active, setActive] = useState(0);
  const setSleeve = useBoxBuilder((s) => s.setSleeve);
  const o = OCCASIONS[active]!;

  return (
    <section className="relative mx-auto max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-24 -z-10 mx-auto h-[70%] max-w-5xl rounded-full blur-3xl transition-[background] duration-700"
        style={{ background: `radial-gradient(closest-side, rgba(${o.glow},0.22), transparent)` }}
      />

      <header className="max-w-2xl">
        <p className="font-sub text-xs font-semibold tracking-[0.28em] text-celebration-gold/80 uppercase">Pick the occasion</p>
        <h2 className="mt-3 font-display text-4xl leading-[1.02] font-semibold text-balance sm:text-5xl">One studio, every kind of party.</h2>
      </header>

      <div role="tablist" aria-label="Occasion" className="mt-8 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {OCCASIONS.map((x, i) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            id={`occ-tab-${x.id}`}
            aria-selected={i === active}
            aria-controls="occ-panel"
            onClick={() => setActive(i)}
            className={cn(
              "relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 font-sub text-sm font-medium transition-colors",
              i === active ? "text-ivory" : "text-mist-muted hover:text-mist",
            )}
          >
            {i === active && (
              <motion.span
                layoutId="occ-pill"
                className="absolute inset-0 rounded-full btn-luxe"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            {i !== active && <span className="absolute inset-0 rounded-full border border-ink/12 bg-ink/[0.03]" />}
            <x.Icon className="relative size-4" aria-hidden />
            <span className="relative">{x.tab}</span>
          </button>
        ))}
      </div>

      <div id="occ-panel" role="tabpanel" aria-labelledby={`occ-tab-${o.id}`} className="mt-8 grid items-stretch gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-ink/10 bg-dark-card lg:aspect-auto lg:min-h-[440px]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={o.id}
              initial={{ opacity: 0, scale: 1.08, clipPath: "inset(0 0 0 100%)" }}
              animate={{ opacity: 1, scale: 1, clipPath: "inset(0 0 0 0%)" }}
              exit={{ opacity: 0.4, scale: 1.02 }}
              transition={{ duration: 0.8, ease: [0.7, 0, 0.2, 1] }}
              className="absolute inset-0"
            >
              <Image src={o.image} alt={o.alt} fill sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/70 via-transparent to-transparent" />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="glass-panel relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] p-7 sm:p-9">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <h3 className="font-display text-3xl leading-tight font-semibold text-balance sm:text-4xl">{o.title}</h3>
              <p className="mt-4 leading-relaxed text-mist-muted">{o.body}</p>
              <p className="mt-8 font-sub text-[11px] font-semibold tracking-[0.24em] text-mist-faint uppercase">In the suggested box</p>
              <ul className="mt-3 space-y-2.5">
                {o.picks.map((p, i) => (
                  <motion.li
                    key={p}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.07 }}
                    className="flex items-center gap-3 text-mist"
                  >
                    <span className="size-1.5 rotate-45 bg-celebration-gold" aria-hidden />
                    {p}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          <Link
            href="/build"
            onClick={() => setSleeve(o.sleeveId)}
            className="group mt-10 inline-flex h-12 w-fit items-center gap-2 rounded-full btn-luxe px-6 text-[15px] font-medium text-ivory transition-shadow hover:-translate-y-0.5"
          >
            Start this box
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
