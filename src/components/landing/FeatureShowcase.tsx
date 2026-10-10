"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowUpRight, Boxes, Calculator, Gift, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "success" | "lavender" | "gold" | "coral";

interface Feature {
  href: string;
  title: string;
  body: string;
  Icon: LucideIcon;
  accent: string; // icon tile + hover glow
  glow: string;
  badges: { label: string; tone: BadgeTone }[];
}

const FEATURES: Feature[] = [
  {
    href: "/build",
    title: "Build Your Box in 3D",
    body: "Pick the sleeve, print your message, choose snacks and cake tiers. Watch it assemble, with live dietary checks.",
    Icon: Boxes,
    accent: "text-celebration-gold bg-celebration-gold/10",
    glow: "rgba(245,208,97,0.16)",
    badges: [
      { label: "Eggless", tone: "success" },
      { label: "Vegan", tone: "success" },
      { label: "Gluten-free", tone: "lavender" },
    ],
  },
  {
    href: "/sos",
    title: "SOS Express 90m Slot",
    body: "Forgot it was today? Pre-packed kits from your nearest hub, live stock by PIN code, priority packing.",
    Icon: Zap,
    accent: "text-celebration-coral bg-celebration-coral/10",
    glow: "rgba(255,94,91,0.16)",
    badges: [
      { label: "60–90 min", tone: "coral" },
      { label: "Live stock", tone: "gold" },
    ],
  },
  {
    href: "/plan",
    title: "Smart Party Calculator",
    body: "Headcount, age mix and theme in. Exact boxes, snack kilos, cake weight and decor out, without over-ordering.",
    Icon: Calculator,
    accent: "text-celebration-lavender bg-celebration-lavender/10",
    glow: "rgba(167,139,250,0.18)",
    badges: [
      { label: "Kids · Teens · Adults", tone: "lavender" },
      { label: "No waste", tone: "success" },
    ],
  },
  {
    href: "/build#favors",
    title: "Premium Return Gifts",
    body: "Seed-paper confetti cards, soy candles, giant bubble wands and personalised totes, packed in every box.",
    Icon: Gift,
    accent: "text-celebration-gold bg-celebration-gold/10",
    glow: "rgba(245,208,97,0.14)",
    badges: [
      { label: "Personalised", tone: "gold" },
      { label: "Eco seed-paper", tone: "success" },
    ],
  },
];

const BADGE: Record<BadgeTone, string> = {
  success: "bg-celebration-success/15 text-[#6EE7B7] ring-celebration-success/30",
  lavender: "bg-celebration-lavender/15 text-[#C9B8FD] ring-celebration-lavender/30",
  gold: "bg-celebration-gold/15 text-[#F9E29A] ring-celebration-gold/30",
  coral: "bg-celebration-coral/15 text-[#FF918F] ring-celebration-coral/30",
};

const grid: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const card: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] } },
};

/** Tracks the pointer into CSS vars so a soft spotlight follows the cursor inside the card. */
function trackPointer(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export function FeatureShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="font-sub text-xs font-semibold tracking-[0.28em] text-celebration-gold/80 uppercase">Why festoon</p>
        <h2 className="mt-3 font-display text-4xl leading-[1.02] font-bold text-balance sm:text-5xl">Everything a party needs, in one cart.</h2>
      </motion.header>

      <motion.ul
        variants={grid}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FEATURES.map((f) => (
          <motion.li key={f.title} variants={card}>
            <Link
              href={f.href}
              onMouseMove={trackPointer}
              className="glass-panel group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]"
              style={{ ["--glow" as string]: f.glow }}
            >
              {/* Internal highlights: top specular line + cursor spotlight */}
              <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />
              <span
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "radial-gradient(260px circle at var(--mx, 50%) var(--my, 0%), var(--glow), transparent 70%)" }}
                aria-hidden
              />

              <div className="relative flex items-start justify-between">
                <span className={cn("grid size-12 place-items-center rounded-2xl ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3", f.accent)}>
                  <f.Icon className="size-6" strokeWidth={1.75} />
                </span>
                <ArrowUpRight className="size-5 text-mist-faint transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-mist" />
              </div>

              <h3 className="relative mt-8 font-display text-xl font-semibold">{f.title}</h3>
              <p className="relative mt-2 flex-1 text-sm leading-relaxed text-mist-muted">{f.body}</p>

              <ul className="relative mt-5 flex flex-wrap gap-1.5">
                {f.badges.map((b) => (
                  <li key={b.label} className={cn("rounded-full px-2.5 py-1 font-sub text-[10px] font-semibold tracking-wide uppercase ring-1", BADGE[b.tone])}>
                    {b.label}
                  </li>
                ))}
              </ul>
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
