"use client";

import { motion } from "framer-motion";
import { Gift, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ClientPayment } from "@/lib/booking/gateways/types";
import type { PublicSplitLink } from "@/lib/booking/split";
import { openCheckout, postJson } from "@/lib/client/checkout";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/domain/money";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";

export function SplitPayContribute({ token, link }: { token: string; link: PublicSplitLink }) {
  const router = useRouter();
  const remaining = Math.max(0, link.target - link.raised);
  const presets = [...new Set([link.suggestedShare, Math.round(link.suggestedShare / 2 / 100) * 100, remaining].filter((v) => v > 0 && v <= remaining))].sort((a, b) => a - b);
  const [amount, setAmount] = useState(Math.min(link.suggestedShare, remaining));
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [provider, setProvider] = useState<"RAZORPAY" | "STRIPE">("RAZORPAY");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pct = Math.min(100, (link.raised / link.target) * 100);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await postJson<{ payment: ClientPayment }>(`/api/split/${token}`, { displayName: name, note, amount, provider });
      if (!res.ok) return setError(res.error);
      const outcome = await openCheckout(res.data.payment);
      if (outcome === "paid") router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed to open");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Glass strong prism className="p-7">
        <p className="font-sub text-xs uppercase tracking-[0.3em] text-champagne">Group gift · <span className="font-mono tracking-normal">{link.reference}</span></p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight">{link.theme ? `${link.theme} party` : "A celebration"} for {link.guestCount} guests</h1>
        <p className="mt-2 text-mist-muted">{new Date(link.eventDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        <div className="mt-8">
          <div className="flex items-end justify-between">
            <p className="font-display text-3xl font-semibold tabular-nums">{formatPaise(link.raised)}</p>
            <p className="text-sm text-mist-muted">of {formatPaise(link.target)}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-champagne via-tangerine to-lavender" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }} />
          </div>
        </div>
        <ul className="mt-8 space-y-3">
          {link.contributors.map((c, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lavender/20 font-semibold text-lavender-300">{c.name.slice(0, 1).toUpperCase()}</span>
              <span className="flex-1">
                <span className="font-semibold">{c.name}</span> <span className="text-mist-faint">chipped in {formatPaise(c.amount)}</span>
                {c.note && <span className="block text-mist-muted">“{c.note}”</span>}
              </span>
            </li>
          ))}
          {link.contributors.length === 0 && <li className="text-sm text-mist-faint">Be the first to chip in.</li>}
        </ul>
      </Glass>

      <Glass className="p-7">
        {!link.open || remaining === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <Gift className="mx-auto size-10 text-champagne" />
              <p className="mt-4 font-display text-2xl font-semibold">{remaining === 0 ? "Fully funded — thank you!" : "This link has closed"}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <h2 className="font-display text-2xl font-semibold">Chip in</h2>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button key={p} type="button" onClick={() => setAmount(p)} className={cn("rounded-full border px-4 py-2 text-sm font-semibold tabular-nums", amount === p ? "border-champagne bg-champagne/15 text-champagne" : "border-ink/10 hover:border-ink/25")}>
                  {p === remaining ? `Cover the rest · ${formatPaise(p)}` : formatPaise(p)}
                </button>
              ))}
            </div>
            <label className="block text-xs text-mist-muted">
              Custom amount (₹)
              <input type="number" min={100} max={Math.floor(remaining / 100)} value={Math.round(amount / 100)} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0) * 100)} className="glass mt-1.5 h-12 w-full rounded-2xl px-4 text-base outline-none" />
            </label>
            <input required maxLength={60} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="glass h-12 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-mist-faint" />
            <input maxLength={140} placeholder="A note for the host (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="glass h-12 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-mist-faint" />
            <div className="flex gap-2 rounded-full bg-ink/[0.05] p-1 text-sm">
              {(["RAZORPAY", "STRIPE"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setProvider(p)} className={cn("flex-1 rounded-full py-2 font-medium", provider === p ? "bg-ink/10" : "text-mist-faint")}>
                  {p === "RAZORPAY" ? "UPI / Cards" : "International card"}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-tangerine-300" role="alert">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy || !name.trim() || amount <= 0}>
              {busy ? <LoaderCircle className="size-5 animate-spin" /> : `Contribute ${formatPaise(amount)}`}
            </Button>
          </form>
        )}
      </Glass>
    </div>
  );
}
