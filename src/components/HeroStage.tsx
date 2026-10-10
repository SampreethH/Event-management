"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Ban, Leaf, Wheat, Zap, type LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { detectQuality, subscribeNoop } from "@/components/three/capability";
import { SceneBoundary } from "@/components/three/SceneBoundary";
import { cn } from "@/lib/cn";
import { CATALOG } from "@/lib/domain/catalog";

const GiftBox3D = dynamic(() => import("./GiftBox3D"), {
  ssr: false,
  loading: () => <StaticBox />,
});

type DietKey = "eggless" | "vegan" | "glutenFree";
const DIETS: { key: DietKey; label: string; Icon: LucideIcon }[] = [
  { key: "eggless", label: "Eggless", Icon: Ban },
  { key: "vegan", label: "Vegan", Icon: Leaf },
  { key: "glutenFree", label: "Gluten-free", Icon: Wheat },
];
const EDIBLES = CATALOG.filter((i) => i.category === "snack" || i.category === "cake" || i.category === "confectionery");

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] } },
};

/** High-res pre-rendered frame of the same scene, for devices that can't (or shouldn't) run WebGL. */
function StaticBox() {
  return (
    <Image
      src="/hero/gift-box.png"
      alt="Navy Happy Everything gift box, lid open, with cake, cookies, macarons and wrapped presents floating above it among balloons and confetti"
      fill
      priority
      sizes="(min-width: 1024px) 60vw, 100vw"
      className="object-contain"
    />
  );
}

/**
 * Split hero matching the reference: copy column on the left (~40%), a large
 * frameless 3D stage on the right (~60%) that rises behind the navbar. The canvas
 * starts where the copy column ends, so they never overlap.
 */
export function HeroStage() {
  const quality = useSyncExternalStore(subscribeNoop, detectQuality, () => null);
  const reduce = useReducedMotion() ?? false;
  const stage = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [active, setActive] = useState(true);
  const [fallback, setFallback] = useState(false);
  const [diet, setDiet] = useState<Record<DietKey, boolean>>({ eggless: true, vegan: false, glutenFree: false });
  const [dietTouched, setDietTouched] = useState(false);

  // Lid opens shortly after load or on first scroll — unless the visitor has toggled it.
  useEffect(() => {
    if (touched) return;
    const t = setTimeout(() => setOpen(true), reduce ? 0 : 1200);
    const onScroll = () => window.scrollY > 40 && setOpen(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, [touched, reduce]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(Boolean(e?.isIntersecting)), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    setTouched(true);
    setOpen((o) => !o);
  };
  const matches = useMemo(() => EDIBLES.filter((i) => DIETS.every((d) => !diet[d.key] || i[d.key])).length, [diet]);
  const useStatic = quality === "static" || fallback;

  return (
    <section className="relative isolate overflow-hidden">
      {/* Purple bloom behind the box + warm corner glow */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute top-[18%] right-[8%] h-[70%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgba(201,162,87,0.28),rgba(214,170,160,0.12)_55%,transparent)] blur-2xl" />
        <div className="absolute right-0 bottom-0 h-1/2 w-1/3 bg-[radial-gradient(closest-side,rgba(138,100,39,0.08),transparent)]" />
      </div>

      <div className="relative mx-auto grid min-h-[100svh] max-w-[1400px] grid-rows-[1fr_auto] px-6 pt-28 pb-8 sm:px-10 lg:px-14">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)]">
          {/* ── Copy column ── */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="relative z-10 pt-6 lg:pt-0">
            <motion.h1 variants={rise} className="font-sans text-[clamp(2.6rem,5.2vw,4.6rem)] leading-[1.08] font-bold tracking-tight text-mist">
              Party in a box,
              <br />
              on demand.
            </motion.h1>

            <motion.p variants={rise} className="mt-5 max-w-[30rem] font-sans text-[clamp(1rem,1.4vw,1.2rem)] leading-relaxed text-mist-muted">
              Ready-made snacks, cake, and customized return gifts delivered to your doorstep in 60-90 minutes.
            </motion.p>

            <motion.div variants={rise} className="mt-8 flex flex-wrap items-center gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 24 }}>
                <Link
                  href="/build"
                  className="inline-flex h-14 items-center rounded-full btn-luxe px-7 font-sans text-base lg:h-12 lg:px-6 xl:h-14 xl:px-8 xl:text-[17px] font-medium whitespace-nowrap text-ivory transition-shadow duration-300 hover:shadow-[0_0_44px_-2px_rgba(138,100,39,0.75),inset_0_1px_0_rgba(255,255,255,0.5)]"
                >
                  Design your box
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 24 }}>
                <Link
                  href="/sos"
                  className="group inline-flex h-14 items-center gap-2 rounded-full border border-ink/20 bg-ink/[0.04] px-6 font-sans text-base lg:h-12 lg:px-5 xl:h-14 xl:px-6 xl:text-[17px] whitespace-nowrap text-lavender-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-md transition-colors hover:border-celebration-lavender/50 hover:bg-ink/[0.07]"
                >
                  <Zap className="size-5 text-celebration-lavender transition-transform group-hover:-rotate-12" aria-hidden />
                  I need it now
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* ── 3D stage: frameless, rises behind the navbar on desktop ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex flex-col items-center"
          >
            <div
              ref={stage}
              className="relative h-[clamp(380px,62vw,520px)] w-full [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)] lg:-mt-28 lg:h-[min(78svh,700px)]"
            >
              {quality === null ? null : useStatic ? (
                <button type="button" onClick={toggle} className="absolute inset-0" aria-label="Gift box illustration">
                  <StaticBox />
                </button>
              ) : (
                <SceneBoundary name="gift-box" fallback={<StaticBox />}>
                  <GiftBox3D open={open} onToggle={toggle} quality={quality} active={active} still={reduce} onFallback={() => setFallback(true)} />
                </SceneBoundary>
              )}
            </div>
            <p className="mt-1 rounded-full border border-ink/15 bg-ink/[0.05] px-5 py-2 font-sans text-sm text-mist/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-md">
              Drag to spin • tap or scroll to open
            </p>
          </motion.div>
        </div>

        {/* ── Dietary chips ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Dietary filters">
            {DIETS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={diet[key]}
                onClick={() => {
                  setDietTouched(true);
                  setDiet((d) => ({ ...d, [key]: !d[key] }));
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-sans text-sm transition-all duration-200",
                  diet[key]
                    ? "border-celebration-gold/60 bg-celebration-gold/10 text-champagne shadow-[0_0_16px_-6px_rgba(138,100,39,0.6)]"
                    : "border-ink/15 text-mist-muted hover:border-ink/30 hover:text-mist",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
          {/* Count only appears once the visitor starts filtering, keeping the resting layout clean. */}
          <AnimatePresence>
            {dietTouched && (
              <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="font-sans text-sm text-mist-muted" aria-live="polite">
                <span className="font-mono text-celebration-gold">{matches}</span> treats match ·{" "}
                <Link href="/build" className="text-mist underline decoration-ink/20 underline-offset-4 hover:decoration-celebration-gold">
                  build with them
                </Link>
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
