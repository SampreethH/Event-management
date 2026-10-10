"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, Ban, Leaf, ShieldCheck, Sparkles, Users, Wheat, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { detectQuality, subscribeNoop } from "@/components/three/capability";
import { SceneBoundary } from "@/components/three/SceneBoundary";
import { FINISHES, type SleeveFinish } from "@/components/three/finishes";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { FinishPicker } from "@/components/landing/FinishPicker";
import { FoilDrip } from "@/components/landing/FoilDrip";
import { WordSweep } from "@/components/landing/WordSweep";
import { OccasionSwitcher } from "@/components/landing/OccasionSwitcher";
import { MomentsCollage } from "@/components/landing/MomentsCollage";
import { PartyCalculator } from "@/components/features/PartyCalculator";
import { ButtonLink } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";

const MidnightBoxStage = dynamic(() => import("@/components/FestoonExperience").then((m) => m.MidnightBoxStage), {
  ssr: false,
});

type Beat = {
  id: string;
  open: boolean;
  burst: boolean;
  shot: "arrive" | "logo" | "zoom" | "unveil" | "wide";
  kicker: string;
  title: string;
  body: string;
  hint?: string;
  pills?: string[];
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
};

const BEATS: Beat[] = [
  {
    id: "arrive",
    open: false,
    burst: false,
    shot: "arrive",
    kicker: "Midnight Foil",
    title: "Party in a box, on demand.",
    body: "Snacks, cake and return gifts — designed in 3D, packed like a present, at your door in 60–90 minutes.",
    hint: "Scroll to turn the box",
    primary: { href: "/build", label: "Design your box" },
    secondary: { href: "/sos", label: "I need it now" },
  },
  {
    id: "logo",
    open: false,
    burst: false,
    shot: "logo",
    kicker: "The mark",
    title: "Turn it. That's Festoon.",
    body: "Hot-foil on obsidian board. The name sits on the face like a stamp, not a sticker.",
    hint: "Scroll to lean in",
  },
  {
    id: "zoom",
    open: false,
    burst: false,
    shot: "zoom",
    kicker: "Midnight Foil",
    title: "Close enough to read the grain.",
    body: "Champagne foil, a double frame, the rule and the diamond. This is the sleeve you'll hand to someone.",
    hint: "Scroll to open",
  },
  {
    id: "unveil",
    open: true,
    burst: true,
    shot: "unveil",
    kicker: "Lift the lid",
    title: "Every celebration, packed like a gift.",
    body: "The lid lifts. Cake, macarons, truffles — labelled for the people at the table, not a generic hamper.",
    pills: ["Eggless", "Vegan", "Gluten-free"],
    primary: { href: "/build", label: "Build with dietary filters" },
  },
  {
    id: "express",
    open: true,
    burst: false,
    shot: "wide",
    kicker: "SOS express",
    title: "The party is today. We already packed.",
    body: "Pre-packed kits from the nearest hub. Live stock by PIN. Priority out the door in 60–90 minutes — not tomorrow.",
    primary: { href: "/sos", label: "Check 90-minute slots" },
  },
  {
    id: "host",
    open: false,
    burst: false,
    shot: "wide",
    kicker: "Host together",
    title: "Split the bill. Keep the friendship.",
    body: "One secure link. Cousins, colleagues and co-hosts chip in any amount. We start packing the moment it is funded.",
    primary: { href: "/plan", label: "Size the party" },
  },
  {
    id: "book",
    open: true,
    burst: true,
    shot: "unveil",
    kicker: "Your move",
    title: "Design it. We'll dress the room.",
    body: "Start with a box, skip to décor, or talk to the concierge. Either way, the next celebration should feel inevitable.",
    primary: { href: "/build", label: "Start designing" },
    secondary: { href: "/decor", label: "Preview décor" },
  },
];

const SHOTS = BEATS.map((b) => b.shot);
const OPEN = BEATS.map((b) => (b.open ? 1 : 0));

/** Lid position for a fractional beat: holds each beat's state, then lifts or closes across the gap. */
function openAt(f: number) {
  const c = Math.min(Math.max(f, 0), BEATS.length - 1);
  const i = Math.min(Math.floor(c), BEATS.length - 2);
  const t = c - i;
  const s = Math.min(Math.max((t - 0.3) / 0.6, 0), 1);
  const e = s * s * (3 - 2 * s);
  return OPEN[i]! + (OPEN[i + 1]! - OPEN[i]!) * e;
}

function StaticBox() {
  return (
    <Image
      src="/hero/midnight-foil.png"
      alt="Obsidian Midnight Foil gift box with gold foil lettering, lid lifted over cake, macarons and a wrapped present"
      fill
      priority
      sizes="(min-width: 1024px) 60vw, 100vw"
      className="object-contain object-right lg:object-center"
    />
  );
}

function ScrollHint({ label }: { label: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.6 }}
      className="mt-10 flex items-center gap-2 font-sub text-xs tracking-[0.22em] text-mist-muted uppercase"
    >
      <span className="grid size-8 place-items-center rounded-full border border-white/15 bg-white/5">
        <ArrowDown className="size-3.5 animate-bounce" aria-hidden />
      </span>
      {label}
    </motion.p>
  );
}

function BeatCopy({ beat, active }: { beat: Beat; active: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {active && (
        <motion.div
          key={beat.id}
          initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -18, filter: "blur(6px)" }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="max-w-xl"
        >
          <p className="font-sub text-xs font-semibold tracking-[0.32em] text-celebration-gold/85 uppercase">{beat.kicker}</p>
          <h2 className="mt-4 font-display text-[clamp(2.4rem,5vw,4.4rem)] leading-[1.04] font-bold tracking-tight text-balance text-mist">
            {beat.title}
          </h2>
          <p className="mt-5 max-w-md text-[clamp(1rem,1.3vw,1.2rem)] leading-relaxed text-[#B4BCCB]">{beat.body}</p>
          {beat.pills && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {beat.pills.map((p) => (
                <li
                  key={p}
                  className="rounded-full border border-celebration-gold/35 bg-celebration-gold/10 px-3.5 py-1.5 font-sub text-xs font-medium text-[#F9E29A]"
                >
                  {p}
                </li>
              ))}
            </ul>
          )}
          {(beat.primary || beat.secondary) && (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {beat.primary && (
                <Link
                  href={beat.primary.href}
                  className="inline-flex h-12 items-center rounded-full bg-gradient-to-b from-[#F9DD84] to-celebration-gold px-6 font-sans text-[15px] font-medium text-dark-bg shadow-[0_0_32px_-4px_rgba(245,208,97,0.55),inset_0_1px_0_rgba(255,255,255,0.5)] transition-shadow hover:shadow-[0_0_44px_-2px_rgba(245,208,97,0.75)]"
                >
                  {beat.primary.label}
                </Link>
              )}
              {beat.secondary && (
                <Link
                  href={beat.secondary.href}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-5 font-sans text-[15px] text-[#C9B8FD] backdrop-blur-md transition-colors hover:border-celebration-lavender/50 hover:bg-white/[0.07]"
                >
                  {beat.id === "arrive" ? <Zap className="size-4 text-celebration-lavender" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                  {beat.secondary.label}
                </Link>
              )}
            </div>
          )}
          {beat.hint && <ScrollHint label={beat.hint} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProgressRail({ index }: { index: number }) {
  return (
    <ol className="pointer-events-none absolute top-1/2 right-4 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex" aria-hidden>
      {BEATS.map((b, i) => (
        <li
          key={b.id}
          className={cn("h-8 w-px rounded-full transition-all duration-500", i === index ? "bg-celebration-gold shadow-[0_0_12px_rgba(245,208,97,0.8)]" : "bg-white/20")}
        />
      ))}
    </ol>
  );
}

export function CinematicHome() {
  const quality = useSyncExternalStore(subscribeNoop, detectQuality, () => null);
  const reduce = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const [active, setActive] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);
  const lastOpen = useRef(false);
  const indexRef = useRef(0);
  // Fractional beat index driven by scroll (0 … BEATS.length - 1) and the lid it implies.
  const progress = useRef(0);
  const openAmount = useRef(0);
  // A tap on the box wins over the scroll track until the reader scrolls on a little.
  const manual = useRef<{ open: boolean; at: number } | null>(null);
  const [finish, setFinish] = useState<SleeveFinish>("midnight");
  const wide = useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
  const useStatic = quality === "static" || reduce;

  const applyBeat = useCallback(
    (next: number) => {
      if (indexRef.current === next) return;
      indexRef.current = next;
      const beat = BEATS[next]!;
      setIndex(next);
      setOpen(beat.open);
      if (beat.open && beat.burst && !lastOpen.current) {
        setBurst((n) => n + 1);
      }
      lastOpen.current = beat.open;
      if (beat.shot === "zoom" && !reduce) {
        // Full stamp pattern: a short buzz, pause, longer buzz — not a single truncated tick.
        navigator.vibrate?.([12, 40, 18, 30, 10]);
      }
    },
    [reduce],
  );

  useEffect(() => {
    const nodes = chapterRefs.current.filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target) return;
        const i = Number((visible.target as HTMLElement).dataset.index);
        if (Number.isFinite(i)) applyBeat(i);
      },
      { threshold: [0.35, 0.55, 0.72], rootMargin: "-12% 0px -18% 0px" },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [applyBeat]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(Boolean(e?.isIntersecting)), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const nodes = chapterRefs.current;
      const mid = window.scrollY + window.innerHeight / 2;
      let f = 0;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!n) continue;
        const top = n.getBoundingClientRect().top + window.scrollY;
        if (mid >= top) f = i + Math.min((mid - top) / Math.max(n.offsetHeight, 1), 1) - 0.5;
      }
      f = Math.min(Math.max(f, 0), BEATS.length - 1);
      progress.current = f;
      const m = manual.current;
      if (m && Math.abs(f - m.at) > 0.35) manual.current = null;
      openAmount.current = manual.current ? (manual.current.open ? 1 : 0) : openAt(f);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // OrbitControls sits on the full-viewport canvas; without this, the wheel never
  // reaches the document and the scroll story cannot play.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.scrollBy(0, e.deltaY);
    };
    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  const toggle = () => {
    const isOpenNow = manual.current ? manual.current.open : openAmount.current > 0.5;
    const next = !isOpenNow;
    manual.current = { open: next, at: progress.current };
    openAmount.current = next ? 1 : 0;
    if (next) setBurst((n) => n + 1);
    setOpen(next);
  };
  const glow = FINISHES[finish].glow;

  return (
    <>
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="sticky top-0 h-svh">
            <div
              className="absolute top-[8%] right-[-10%] h-[70%] w-[65%] rounded-full blur-2xl transition-[background] duration-700"
              style={{ background: `radial-gradient(closest-side, rgba(${glow},0.32), rgba(${glow},0.08) 55%, transparent)` }}
            />
            <div className="absolute bottom-[8%] left-[8%] h-[40%] w-[40%] rounded-full bg-[radial-gradient(closest-side,rgba(245,208,97,0.12),transparent)] blur-2xl" />
          </div>
        </div>

        <div ref={stage} className="sticky top-0 z-0 h-svh w-full">
          {quality === null ? null : useStatic ? (
            <button type="button" onClick={toggle} className="absolute inset-0" aria-label="Midnight Foil gift box">
              <StaticBox />
            </button>
          ) : (
            <SceneBoundary name="landing-box" fallback={<StaticBox />}>
              <MidnightBoxStage
                isOpen={open}
                burst={burst}
                onToggle={toggle}
                quality={quality}
                active={active}
                enableZoom={false}
                framing={wide ? "right" : "center"}
                shot={BEATS[index]!.shot}
                track={reduce ? undefined : { progress, shots: SHOTS }}
                openRef={reduce ? undefined : openAmount}
                follow={!reduce}
                finish={finish}
              />
            </SceneBoundary>
          )}
          <ProgressRail index={index} />
          {!useStatic && <FinishPicker value={finish} onChange={setFinish} />}
        </div>

        <div className="pointer-events-none relative z-10 -mt-[100svh]">
          {BEATS.map((beat, i) => (
            <article
              key={beat.id}
              ref={(el) => {
                chapterRefs.current[i] = el;
              }}
              data-index={i}
              className={cn(
                // Click-through outside the copy card, so the box (tap to open) and the sleeve picker stay reachable.
                "pointer-events-none flex min-h-[100svh] px-6 pt-28 pb-16 sm:px-10 lg:px-14",
                beat.shot === "logo" || beat.shot === "zoom" ? "items-start lg:items-center" : "items-center",
              )}
            >
              <div className="pointer-events-none mx-auto flex w-full max-w-[1400px]">
                <div className="pointer-events-auto w-full max-w-xl rounded-3xl border border-white/10 bg-[#07080e]/78 p-6 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl lg:w-[44%] lg:max-w-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
                  <BeatCopy beat={beat} active={index === i || reduce} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <FoilDrip />

      <FeatureShowcase />

      <WordSweep />

      <OccasionSwitcher />

      <section className="mx-auto max-w-6xl px-4 pt-32 sm:px-6">
        <SectionHeading eyebrow="Smart party calculator" title="How much do we actually need?">
          Tell us who&apos;s coming. We&apos;ll size the boxes, snacks, cake and décor so nothing runs out and nothing goes to waste.
        </SectionHeading>
        <div className="mt-10">
          <PartyCalculator />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pt-32 sm:px-6 md:grid-cols-2">
        <Glass prism className="p-8">
          <Users className="size-8 text-lavender" strokeWidth={1.5} />
          <h3 className="mt-6 font-display text-3xl font-bold">Split the bill, not the friendship.</h3>
          <p className="mt-3 text-mist-muted">
            Choose group split-pay at checkout and share one secure link. Cousins, colleagues and co-hosts chip in any amount; we start packing the moment it&apos;s funded.
          </p>
        </Glass>
        <Glass className="p-8">
          <ShieldCheck className="size-8 text-mint-300" strokeWidth={1.5} />
          <h3 className="mt-6 font-display text-3xl font-bold">Explore freely. Book securely.</h3>
          <p className="mt-3 text-mist-muted">
            Design and price without an account. When you book, a one-time code verifies it&apos;s you — with optional authenticator-app 2FA. Addresses are encrypted at rest.
          </p>
        </Glass>
      </section>

      <MomentsCollage />

      <section className="mx-auto max-w-4xl px-4 pt-32 text-center sm:px-6">
        <p className="font-sub text-xs font-semibold tracking-[0.28em] text-celebration-gold/80 uppercase">Concierge</p>
        <h2 className="mt-4 font-display text-[clamp(2.4rem,6vw,4.5rem)] leading-none font-bold tracking-tight text-balance">
          Something bespoke in mind?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-mist-muted">Weddings, launches, 200-kid school days. Our concierge will design it with you.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/build" size="lg">
            Start designing
          </ButtonLink>
          <ButtonLink href="/decor" size="lg" variant="glass">
            Preview décor
          </ButtonLink>
        </div>
        <p className="mt-6 flex items-center justify-center gap-4 text-xs text-mist-faint">
          <span className="inline-flex items-center gap-1.5">
            <Ban className="size-3.5" aria-hidden /> Eggless
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Leaf className="size-3.5" aria-hidden /> Vegan
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wheat className="size-3.5" aria-hidden /> Gluten-free
          </span>
        </p>
      </section>
    </>
  );
}
