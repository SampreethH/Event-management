"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Cake, Candy, Gift, Palette, Popcorn, Sparkles, type LucideIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { MagneticLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { tilt } from "@/lib/client/pointer-fx";
import { CATALOG, byCategory, type CatalogItem } from "@/lib/domain/catalog";
import { formatPaise } from "@/lib/domain/money";

interface Course {
  id: string;
  title: string;
  note: string;
  Icon: LucideIcon;
  items: CatalogItem[];
  featured?: boolean;
}

const COURSES: Course[] = [
  { id: "snacks", title: "Snacks", note: "Pick up to 6", Icon: Popcorn, items: byCategory("snack").filter((i) => !i.signature) },
  { id: "cake", title: "Cake", note: "One slice per box", Icon: Cake, items: byCategory("cake") },
  { id: "sweets", title: "Sweets & chocolates", note: "Up to 3", Icon: Candy, items: byCategory("confectionery").filter((i) => !i.signature) },
  { id: "specials", title: "Festoon specials", note: "Only in a Festoon box", Icon: Sparkles, items: CATALOG.filter((i) => i.signature), featured: true },
  { id: "gifts", title: "Return gifts", note: "In the box, or a gifts-only box", Icon: Gift, items: byCategory("favor") },
];

const SHOWN = 7;

/** Desktop with a mouse, motion allowed: pin the section and slide the rail sideways. */
function usePinned() {
  const reduce = useReducedMotion() ?? false;
  const wide = useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches,
    () => false,
  );
  return wide && !reduce;
}

/**
 * "The menu": every course in the catalog as a card on one horizontal rail.
 * Pinned on desktop (vertical scroll drives the slide); a native swipe rail on
 * touch and for reduced motion.
 */
export function MenuRail() {
  const pinned = usePinned();
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  useLayoutEffect(() => {
    const el = track.current;
    if (!pinned || !el) return;
    const measure = () => setDistance(Math.max(0, el.scrollWidth - window.innerWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pinned]);

  const heading = (
    <header className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <p className="flex items-center gap-3 font-sub text-xs font-semibold tracking-[0.28em] text-champagne uppercase">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-champagne" aria-hidden />
        The menu
      </p>
      <h2 className="mt-3 max-w-2xl font-display text-4xl leading-[1.02] font-semibold text-balance sm:text-5xl">
        Everything that fits in the box.
      </h2>
      <p className="mt-3 max-w-xl text-mist-muted">
        Bakery-fresh and party-proven, with a couple of things you won&apos;t find in anyone else&apos;s box.
        {pinned && " Keep scrolling to browse."}
      </p>
    </header>
  );

  const cards = (
    <>
      {COURSES.map((c) => (
        <CourseCard key={c.id} course={c} />
      ))}
      <ColoursCard />
    </>
  );

  if (!pinned) {
    return (
      <section className="pt-24 sm:pt-32" aria-label="The menu">
        {heading}
        <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 [scrollbar-width:none] sm:px-6 lg:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]">
          {cards}
        </div>
      </section>
    );
  }

  return (
    <section ref={section} className="relative mt-24 sm:mt-32" style={{ height: `calc(100svh + ${distance}px)` }} aria-label="The menu">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden pt-24">
        {heading}
        <motion.div
          ref={track}
          style={{ x }}
          className="mt-10 flex w-max gap-5 pr-[10vw] pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]"
        >
          {cards}
        </motion.div>
      </div>
    </section>
  );
}

function CourseCard({ course }: { course: Course }) {
  const { title, note, Icon, items, featured } = course;
  const extra = items.length - SHOWN;
  return (
    <article
      {...tilt(5)}
      className={cn(
        "relative flex w-[min(82vw,22rem)] shrink-0 snap-start flex-col rounded-[1.75rem] p-6 transition-transform duration-300 will-change-transform",
        featured ? "btn-luxe" : "glass grain",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("grid size-11 place-items-center rounded-2xl", featured ? "bg-gold-foil text-ink" : "bg-champagne/10 text-champagne")}>
          <Icon className="size-5" strokeWidth={1.7} aria-hidden />
        </span>
        <span className={cn("font-mono text-xs", featured ? "text-champagne-300" : "text-mist-faint")}>{items.length} options</span>
      </div>
      <h3 className="mt-6 font-display text-3xl leading-none font-semibold">{title}</h3>
      <p className={cn("mt-1.5 text-sm", featured ? "text-ivory/70" : "text-mist-faint")}>{note}</p>
      <div className={cn("my-5 h-px", featured ? "bg-champagne-300/30" : "hairline")} />
      <ul className="space-y-2.5 text-sm">
        {items.slice(0, SHOWN).map((i) => (
          <li key={i.id} className="flex items-start gap-3">
            <span className="mt-1 size-2.5 shrink-0 rounded-full ring-1 ring-ink/15" style={{ background: i.color }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block leading-snug">{i.name}</span>
              {featured && <span className="mt-0.5 block text-xs text-ivory/65">{i.blurb}</span>}
            </span>
            <span className={cn("font-mono text-xs tabular-nums", featured ? "text-champagne-300" : "text-mist-faint")}>{formatPaise(i.price)}</span>
          </li>
        ))}
      </ul>
      {extra > 0 && <p className="mt-3 text-xs text-mist-faint">+ {extra} more in the builder</p>}
    </article>
  );
}

function ColoursCard() {
  const sleeves = byCategory("sleeve");
  return (
    <article {...tilt(5)} className="glass grain relative flex w-[min(82vw,22rem)] shrink-0 snap-start flex-col rounded-[1.75rem] p-6 transition-transform duration-300 will-change-transform">
      <span className="grid size-11 place-items-center rounded-2xl bg-champagne/10 text-champagne">
        <Palette className="size-5" strokeWidth={1.7} aria-hidden />
      </span>
      <h3 className="mt-6 font-display text-3xl leading-none font-semibold">Box colours</h3>
      <p className="mt-1.5 text-sm text-mist-faint">Plain board, tied with satin and your message.</p>
      <div className="hairline my-5" />
      <ul className="grid grid-cols-4 gap-3">
        {sleeves.map((s) => (
          <li key={s.id} className="text-center">
            <span className="mx-auto block size-12 rounded-xl ring-1 ring-ink/10" style={{ background: `linear-gradient(135deg, ${s.color} 60%, ${s.accent})` }} aria-hidden />
            <span className="mt-1.5 block text-[11px] leading-tight text-mist-muted">{s.name}</span>
          </li>
        ))}
      </ul>
      <MagneticLink href="/build" className="btn-luxe mt-auto inline-flex h-12 items-center justify-center gap-2 self-start rounded-full px-6 text-[15px] font-medium transition-all duration-300 hover:-translate-y-0.5">
        Build your box <ArrowRight className="size-4" aria-hidden />
      </MagneticLink>
    </article>
  );
}
