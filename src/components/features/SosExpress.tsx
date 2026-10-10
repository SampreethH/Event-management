"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, LoaderCircle, MapPin, Timer, Truck, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { quoteOrder } from "@/lib/booking/quote";
import { postJson } from "@/lib/client/checkout";
import { cn } from "@/lib/cn";
import { SOS_KITS } from "@/lib/domain/sos";
import { formatPaise } from "@/lib/domain/money";
import { useCart } from "@/stores/cart";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";

interface Availability {
  ok: boolean;
  reason?: "no-zone" | "closed" | "past-cutoff" | "not-express" | "stock";
  zone?: { id: string; name: string };
  etaFrom?: string;
  etaTo?: string;
  cutoffAt?: string;
  queueAhead: number;
  lowStock: boolean;
}

const REASONS: Record<NonNullable<Availability["reason"]>, string> = {
  "no-zone": "We don't have an express hub covering this PIN code yet. Our concierge can still try — tap call below.",
  closed: "The express kitchen opens at 9 am. Pre-book a morning slot instead?",
  "past-cutoff": "Today's last express dispatch has left. Book the first slot tomorrow.",
  "not-express": "This kit includes made-to-order items that can't go express.",
  stock: "The nearest hub is out of this kit right now. Try another — they're stocked separately.",
};

const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—");

function useCountdown(target?: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!target) return;
    const tick = () => setNow(Date.now());
    const raf = requestAnimationFrame(tick);
    const id = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [target]);
  if (!target || now === null) return null;
  const ms = Math.max(0, new Date(target).getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { ms, label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` };
}

/**
 * Flash-booking module for last-minute parties: pick a pre-packed kit, check the
 * PIN code against live hub geofence + stock, then jump the packing queue.
 */
export function SosExpress() {
  const router = useRouter();
  const replaceCart = useCart((s) => s.replace);
  const [kitId, setKitId] = useState(SOS_KITS[0]!.id);
  const [pincode, setPincode] = useState("");
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const countdown = useCountdown(availability?.ok ? availability.cutoffAt : undefined);

  const kit = SOS_KITS.find((k) => k.id === kitId)!;
  const quote = useMemo(() => quoteOrder({ lines: [{ label: kit.name, spec: kit.spec, quantity: kit.boxes }], decor: [], express: true }), [kit]);

  const check = async () => {
    setChecking(true);
    setError(null);
    setAvailability(null);
    const res = await postJson<Availability>("/api/sos/availability", { pincode, kitId });
    setChecking(false);
    if (res.ok) setAvailability(res.data);
    else setError(res.error);
  };

  const book = () => {
    replaceCart([{ label: `SOS · ${kit.name}`, spec: kit.spec, quantity: kit.boxes }], [], true);
    router.push("/checkout");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="grid gap-3">
        {SOS_KITS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => {
              setKitId(k.id);
              setAvailability(null);
            }}
            aria-pressed={kitId === k.id}
            className={cn(
              "glass grain relative flex items-center gap-4 rounded-glass p-5 text-left transition-all",
              kitId === k.id ? "border-tangerine/70! shadow-glow-coral" : "hover:border-ink/25",
            )}
          >
            <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", kitId === k.id ? "bg-tangerine text-white" : "bg-ink/5 text-tangerine")}>
              <Zap className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-semibold">{k.name}</span>
              <span className="block text-sm text-mist-muted">{k.pitch}</span>
            </span>
            <span className="text-right">
              <span className="block font-display text-xl font-semibold tabular-nums">{k.boxes}</span>
              <span className="text-xs text-mist-faint">boxes</span>
            </span>
          </button>
        ))}
      </div>

      <Glass strong prism className="p-6">
        <div className="flex items-center gap-2 font-sub text-xs font-semibold uppercase tracking-[0.25em] text-tangerine">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-tangerine" />
            <span className="relative inline-flex size-2.5 rounded-full bg-tangerine" />
          </span>
          Live dispatch
        </div>
        <p className="mt-3 font-display text-3xl font-semibold">60–90 min to your door</p>

        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d{6}$/.test(pincode)) void check();
          }}
        >
          <label className="glass flex h-12 flex-1 items-center gap-2 rounded-full px-4">
            <MapPin className="size-4 text-mist-faint" />
            <input
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="Delivery PIN code"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full bg-transparent text-sm outline-none placeholder:text-mist-faint"
              aria-label="Delivery PIN code"
            />
          </label>
          <Button type="submit" variant="coral" disabled={pincode.length !== 6 || checking}>
            {checking ? <LoaderCircle className="size-4 animate-spin" /> : "Check"}
          </Button>
        </form>

        <AnimatePresence mode="wait">
          {availability?.ok && (
            <motion.div key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat icon={<Truck className="size-4" />} k="Arrives" v={`${time(availability.etaFrom)} – ${time(availability.etaTo)}`} />
                <Stat icon={<Timer className="size-4" />} k="Order within" v={countdown?.label ?? "—"} hot />
              </div>
              <p className="text-sm text-mist-muted">
                From our <b className="text-mist">{availability.zone?.name}</b> hub ·{" "}
                {availability.queueAhead === 0 ? "you'd be first in the packing queue" : `${availability.queueAhead} express orders ahead of you`}
              </p>
              <dl className="space-y-1 text-sm text-mist-muted">
                <div className="flex justify-between">
                  <dt>Kit + express fee + GST</dt>
                  <dd className="font-display text-lg font-semibold text-mist tabular-nums">{formatPaise(quote.total)}</dd>
                </div>
              </dl>
              <Button variant="coral" size="lg" className="w-full" onClick={book}>
                <Zap className="size-5" /> Dispatch now
              </Button>
            </motion.div>
          )}
          {availability && !availability.ok && availability.reason && (
            <motion.p key="no" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 flex gap-2 rounded-2xl border border-ink/10 bg-ink/[0.05] p-4 text-sm text-mist-muted">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-tangerine" />
              {REASONS[availability.reason]}
            </motion.p>
          )}
          {error && (
            <motion.p key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-sm text-tangerine-300" role="alert">
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </Glass>
    </div>
  );
}

function Stat({ icon, k, v, hot }: { icon: React.ReactNode; k: string; v: string; hot?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-3", hot ? "border-tangerine/40 bg-tangerine/10" : "border-ink/10 bg-ink/[0.03]")}>
      <p className="flex items-center gap-1.5 text-xs text-mist-faint">
        {icon}
        {k}
      </p>
      <p className={cn("mt-1 font-mono text-lg font-medium", hot && "text-tangerine-300")}>{v}</p>
    </div>
  );
}
