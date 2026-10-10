"use client";

import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Scroll-scrubbed footage: the wall gets decorated as you scroll, and rewinds when you scroll back.
 * The clips are encoded with a keyframe every 3 frames so seeking stays smooth. WebM (VP9) is listed
 * first because open-source Chromium builds can't decode H.264; Safari falls through to the MP4.
 * Footage: Pexels video 7119576 (Pexels licence, free for commercial use, no attribution required).
 * Swap /public/media/decor/decorating*.mp4 for a real Festoon setup clip when you have one.
 */
const STEPS = [
  { at: 0, kicker: "Minute 0", title: "The wall goes up.", body: "Pre-cut, pre-inflated and labelled, hung to the layout you approved." },
  { at: 0.34, kicker: "Minute 40", title: "Every letter, level.", body: "Tassels, bunting and balloons, nudged until it photographs right." },
  { at: 0.68, kicker: "Minute 90", title: "Done before the doorbell.", body: "Photo-ready before the first guest arrives. We clear up after." },
];

export function DecorScrub() {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion() ?? false;
  const [step, setStep] = useState(0);
  const [small, setSmall] = useState(false);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setSmall(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // iOS only allows seeking after the media has started once.
  useEffect(() => {
    const v = video.current;
    if (!v || reduce) return;
    const unlock = () => {
      v.play()
        .then(() => v.pause())
        .catch(() => {});
    };
    v.addEventListener("loadedmetadata", unlock, { once: true });
    return () => v.removeEventListener("loadedmetadata", unlock);
  }, [small, reduce]);

  useMotionValueEvent(progress, "change", (p) => {
    const v = video.current;
    if (v && v.duration && !reduce) {
      const t = Math.min(Math.max(p, 0), 1) * (v.duration - 0.05);
      if (Math.abs(v.currentTime - t) > 1 / 40) v.currentTime = t;
    }
    let s = 0;
    for (let i = 0; i < STEPS.length; i++) if (p >= STEPS[i]!.at) s = i;
    setStep(s);
  });

  if (reduce) {
    return (
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10">
        <div className="relative aspect-video">
          <Image src="/media/decor/decorating-poster.webp" alt="A couple hanging pastel HAPPY BIRTHDAY balloon letters on a white wall" fill sizes="100vw" className="object-cover" />
        </div>
        <ol className="grid gap-4 p-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.title}>
              <p className="font-mono text-xs text-celebration-gold">{s.kicker}</p>
              <p className="mt-1 font-display text-lg font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-mist-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  const current = STEPS[step]!;
  return (
    <section ref={section} aria-label="Watch a wall get decorated" className="relative h-[260vh]">
      <div className="sticky top-24 h-[calc(100svh-7rem)] min-h-[420px]">
        <div className="relative h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-dark-card shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]">
          <video
            key={small ? "720" : "1280"}
            ref={video}
            poster="/media/decor/decorating-poster.webp"
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={small ? "/media/decor/decorating-720.webm" : "/media/decor/decorating.webm"} type='video/webm; codecs="vp9"' />
            <source src={small ? "/media/decor/decorating-720.mp4" : "/media/decor/decorating.mp4"} type="video/mp4" />
          </video>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-dark-bg/90 via-dark-bg/10 to-dark-bg/30" />

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-5 p-6 sm:p-10 lg:flex-row lg:items-end lg:justify-between">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.title}
                initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -14, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                className="max-w-lg"
              >
                <p className="font-mono text-xs tracking-widest text-celebration-gold">{current.kicker}</p>
                <h3 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.6rem)] leading-[1.02] font-bold text-mist">{current.title}</h3>
                <p className="mt-3 max-w-md text-mist-muted sm:text-lg">{current.body}</p>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-3" aria-hidden>
              {STEPS.map((s, i) => (
                <span key={s.title} className="h-1 w-14 overflow-hidden rounded-full bg-white/15">
                  <motion.span
                    className="block h-full origin-left rounded-full bg-celebration-gold"
                    animate={{ scaleX: i <= step ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                  />
                </span>
              ))}
            </div>
          </div>

          <p className="absolute top-5 left-6 rounded-full border border-white/15 bg-black/30 px-3 py-1 font-sub text-[11px] tracking-[0.2em] text-mist/80 uppercase backdrop-blur-md sm:left-10">
            Scroll to decorate
          </p>
        </div>
      </div>
    </section>
  );
}
