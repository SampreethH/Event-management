"use client";

import { Check, CircleAlert, Moon, Sun } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { DECOR_KITS, type DecorKit } from "@/lib/domain/catalog";
import { formatPaise } from "@/lib/domain/money";
import { useCart } from "@/stores/cart";
import { detectQuality, subscribeNoop } from "@/components/three/capability";
import type { RoomSize } from "@/components/three/DecorRoomScene";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";

const DecorRoomScene = dynamic(() => import("@/components/three/DecorRoomScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-ink/[0.03]" />,
});

const ROOMS: { id: string; label: string; size: RoomSize }[] = [
  { id: "compact", label: "Compact · 3.6 × 3.0 m", size: { w: 3.6, d: 3.0, h: 2.7 } },
  { id: "standard", label: "Standard · 4.5 × 3.6 m", size: { w: 4.5, d: 3.6, h: 2.8 } },
  { id: "large", label: "Large · 6.0 × 4.5 m", size: { w: 6.0, d: 4.5, h: 3.0 } },
];

/** Clearance we keep around installs for walkways and the decorator's ladder. */
const CLEARANCE = 0.6;

export function DecorVisualizer() {
  const quality = useSyncExternalStore(subscribeNoop, detectQuality, () => null);
  const [roomId, setRoomId] = useState("standard");
  const [kits, setKits] = useState<DecorKit["id"][]>(["neon-backdrop", "balloon-arch"]);
  const [evening, setEvening] = useState(true);
  const cart = useCart();
  const room = ROOMS.find((r) => r.id === roomId)!.size;

  const selected = DECOR_KITS.filter((k) => kits.includes(k.id));
  const widest = Math.max(0, ...selected.map((k) => k.footprint.w));
  const tallest = Math.max(0, ...selected.map((k) => k.footprint.h));
  const depth = selected.reduce((s, k) => s + k.footprint.d, 0);
  const fits = widest + CLEARANCE <= room.w && tallest + 0.2 <= room.h && depth + 1.8 <= room.d;

  const toggle = (id: DecorKit["id"]) => setKits((k) => (k.includes(id) ? k.filter((x) => x !== id) : [...k, id]));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Glass prism className="relative self-start overflow-hidden p-0">
        <div className="aspect-[4/3] w-full">
          {quality && quality !== "static" ? (
            <DecorRoomScene room={room} kits={kits} evening={evening} quality={quality} />
          ) : (
            <div className="grid h-full place-items-center p-8 text-center text-sm text-mist-muted">
              3D preview is off on this device to save battery. Kit dimensions and fit check are shown alongside.
            </div>
          )}
        </div>
        <button type="button" onClick={() => setEvening((e) => !e)} className="glass absolute top-4 right-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium">
          {evening ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          {evening ? "Daylight" : "Evening glow"}
        </button>
        <p className="absolute bottom-4 left-4 rounded-full bg-ivory/80 px-3 py-1 text-xs text-mist-muted backdrop-blur">Drag to look around · scroll to zoom · true to scale</p>
      </Glass>

      <div className="space-y-4">
        <Glass className="p-5">
          <p className="mb-3 text-sm font-semibold">Room size</p>
          <div className="grid gap-2">
            {ROOMS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoomId(r.id)}
                aria-pressed={roomId === r.id}
                className={cn("rounded-xl border px-3 py-2 text-left text-sm transition-all", roomId === r.id ? "border-champagne/70 bg-champagne/10" : "border-ink/10 hover:border-ink/25")}
              >
                {r.label}
              </button>
            ))}
          </div>
        </Glass>

        <Glass className="p-5">
          <p className="mb-3 text-sm font-semibold">Decor kits</p>
          <div className="grid gap-2">
            {DECOR_KITS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => toggle(k.id)}
                aria-pressed={kits.includes(k.id)}
                className={cn("flex items-start gap-3 rounded-xl border p-3 text-left transition-all", kits.includes(k.id) ? "border-lavender/60 bg-lavender/10" : "border-ink/10 hover:border-ink/25")}
              >
                <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border", kits.includes(k.id) ? "border-lavender bg-lavender text-ivory" : "border-ink/25")}>
                  {kits.includes(k.id) && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className="flex-1">
                  <span className="flex justify-between gap-2 text-sm font-semibold">
                    {k.name}
                    <span className="tabular-nums text-mist-muted">{formatPaise(k.price)}</span>
                  </span>
                  <span className="block text-xs text-mist-faint">{k.blurb}</span>
                  <span className="mt-1 block text-[11px] text-mist-faint tabular-nums">
                    {k.footprint.w} × {k.footprint.d} × {k.footprint.h} m · {k.setupMinutes} min setup
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Glass>

        <div className={cn("flex gap-2 rounded-2xl border p-4 text-sm", fits ? "border-mint-300/30 bg-mint-300/10 text-mint-300" : "border-tangerine/40 bg-tangerine/10 text-tangerine-300")}>
          {fits ? <Check className="mt-0.5 size-4 shrink-0" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" />}
          {selected.length === 0
            ? "Pick a kit to check the fit."
            : fits
              ? `Fits with ${CLEARANCE} m clearance. Your decorator needs a ${Math.ceil(tallest + 0.3)} m ceiling-safe ladder.`
              : "Tight squeeze — we'll suggest a compact variant when we confirm."}
        </div>

        <Button
          variant="glass"
          className="w-full"
          disabled={!kits.length}
          onClick={() => {
            for (const id of kits) if (!cart.decor.includes(id)) cart.toggleDecor(id);
          }}
        >
          Add selected decor to cart
        </Button>
      </div>
    </div>
  );
}
