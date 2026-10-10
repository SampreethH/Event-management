"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { detectQuality, subscribeNoop } from "./capability";
import type { PreviewItem } from "./PartyItem";
import { SceneBoundary } from "./SceneBoundary";

const LuxuryPartyBoxScene = dynamic(() => import("./LuxuryPartyBoxScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-ink/[0.02]" />,
});

const DEFAULT_ITEMS: PreviewItem[] = [
  { kind: "snack", color: "#FF5E5B", accent: "#F9E29A" },
  { kind: "cake", color: "#4A2A1E" },
  { kind: "tin", color: "#F5D061", accent: "#FF5E5B" },
  { kind: "macaron", color: "#F4B6C2" },
  { kind: "gift", color: "#A78BFA", accent: "#F5D061" },
];

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (cb: () => void) => {
  const mq = window.matchMedia(reducedMotionQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export interface LuxuryPartyBoxProps {
  boxColor?: string;
  ribbonColor?: string;
  /** Custom text printed on the front band. */
  label?: string;
  items?: PreviewItem[];
  /** Controlled lid state. Omit to let the component manage it. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Allow wheel/pinch zoom. Off by default so the page scroll isn't hijacked. */
  zoom?: boolean;
  dustCount?: number;
  className?: string;
}

/**
 * Luxury gift box with a "peek inside" lid, gold silk ribbon, rising treats and
 * floating gold dust. Production concerns handled here:
 *  - client-only, code-split Canvas (no SSR WebGL), with an error boundary
 *  - device quality tiers + static CSS fallback (no WebGL / low memory / save-data)
 *  - render loop pauses when offscreen; honours prefers-reduced-motion
 *  - no network assets (procedural studio environment, canvas-texture label)
 */
export default function LuxuryPartyBox({
  boxColor = "#111218",
  ribbonColor = "#E8C15A",
  label = "",
  items = DEFAULT_ITEMS,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  zoom = false,
  dustCount = 50,
  className,
}: LuxuryPartyBoxProps) {
  const quality = useSyncExternalStore(subscribeNoop, detectQuality, () => null);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(reducedMotionQuery).matches, () => false);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const container = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(Boolean(entry?.isIntersecting)), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const next = !open;
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const fallback = <StaticBox boxColor={boxColor} ribbonColor={ribbonColor} label={label} open={open} />;

  return (
    <div
      ref={container}
      className={cn(
        "relative h-[600px] w-full overflow-hidden rounded-2xl border border-ink/10 bg-gradient-to-b from-ivory via-dark-bg to-dark-bg",
        className,
      )}
    >
      <div className="absolute top-5 right-6 z-10 flex gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={open}
          className="rounded-full border border-champagne/30 bg-ink/5 px-4 py-2 font-sub text-xs font-semibold tracking-wider text-champagne uppercase shadow-lg backdrop-blur-md transition-all hover:bg-champagne/10"
        >
          {open ? "Close lid" : "Peek inside"}
        </button>
      </div>

      {quality === null ? null : quality === "static" ? (
        fallback
      ) : (
        <SceneBoundary name="luxury-box" fallback={fallback}>
          <LuxuryPartyBoxScene
            open={open}
            boxColor={boxColor}
            ribbonColor={ribbonColor}
            label={label}
            items={items}
            quality={quality}
            active={active}
            still={reducedMotion}
            zoom={zoom}
            dustCount={dustCount}
          />
        </SceneBoundary>
      )}
    </div>
  );
}

/** Zero-WebGL rendition: same colours and label, for low-end devices or a crashed context. */
function StaticBox({ boxColor, ribbonColor, label, open }: { boxColor: string; ribbonColor: string; label: string; open: boolean }) {
  return (
    <div className="grid h-full place-items-center p-10" aria-hidden>
      <div className="relative aspect-square w-3/5 max-w-72">
        <div
          className="absolute inset-x-[-4%] top-0 h-[16%] rounded-lg shadow-xl transition-transform duration-500"
          style={{ background: boxColor, transform: open ? "translateY(-40%) rotate(-6deg)" : undefined }}
        >
          <div className="absolute inset-y-0 left-1/2 w-[15%] -translate-x-1/2" style={{ background: ribbonColor }} />
        </div>
        <div className="absolute inset-x-0 top-[14%] bottom-0 rounded-lg shadow-2xl" style={{ background: `linear-gradient(160deg, ${boxColor}, #000 140%)` }}>
          <div className="absolute inset-y-0 left-1/2 w-[15%] -translate-x-1/2" style={{ background: ribbonColor }} />
          {label && (
            <p className="absolute inset-x-3 bottom-[18%] truncate rounded bg-black/50 px-2 py-1 text-center font-display text-sm font-semibold" style={{ color: ribbonColor }}>
              {label}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
