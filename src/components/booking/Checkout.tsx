"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, CreditCard, MessageCircle, Phone, Trash2, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import type { BookingResult } from "@/lib/booking/engine";
import { quoteOrder } from "@/lib/booking/quote";
import { SLOTS, type AddressInput, type BookingRequest, type EventInput } from "@/lib/booking/schema";
import { encodeConciergeLink, telUrl } from "@/lib/booking/whatsapp";
import { openCheckout, postJson } from "@/lib/client/checkout";
import { useHydrated } from "@/lib/client/use-hydrated";
import { cn } from "@/lib/cn";
import { DECOR_KITS } from "@/lib/domain/catalog";
import { formatPaise } from "@/lib/domain/money";
import { THEMES } from "@/lib/domain/party-calculator";
import { CONCIERGE_PHONE, CONCIERGE_WHATSAPP } from "@/lib/public-config";
import { useCart } from "@/stores/cart";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Stepper } from "@/components/ui/Stepper";

type Plan = BookingRequest["paymentPlan"];
type Provider = BookingRequest["provider"];

const PLANS: { id: Plan; title: string; body: string; Icon: typeof Wallet }[] = [
  { id: "FULL", title: "Pay in full", body: "Settle now, nothing on the day.", Icon: CreditCard },
  { id: "DEPOSIT", title: "30% advance", body: "Balance on delivery — UPI, card or cash.", Icon: Wallet },
  { id: "SPLIT", title: "Group split-pay", body: "Share a link; friends & family chip in.", Icon: Users },
];

const field = "glass h-12 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-mist-faint focus:border-champagne/60";

export function Checkout({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const cart = useCart();
  const hydrated = useHydrated();
  const idempotencyKey = useRef<string | null>(null);
  const [event, setEvent] = useState<EventInput>({ date: "", slot: "16:00-18:00", guestCount: 20, ageGroup: "MIXED", theme: undefined, notes: "" });
  const [address, setAddress] = useState<AddressInput>({ recipientName: "", recipientPhone: "", line1: "", line2: "", landmark: "", city: "", pincode: "" });
  const [plan, setPlan] = useState<Plan>("DEPOSIT");
  const [provider, setProvider] = useState<Provider>("RAZORPAY");
  const [busy, setBusy] = useState<"pay" | "whatsapp" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(BookingResult & { paid?: boolean }) | null>(null);
  const [copied, setCopied] = useState(false);

  const cartInput = useMemo(() => ({ lines: cart.lines, decor: cart.decor, express: cart.express }), [cart.lines, cart.decor, cart.express]);
  const quote = useMemo(() => quoteOrder(cartInput), [cartInput]);
  const dueNow = plan === "DEPOSIT" ? quote.deposit : plan === "SPLIT" ? 0 : quote.total;

  // Guest-friendly: a pre-filled WhatsApp brief that needs no account.
  const directWhatsapp = useMemo(
    () => (cart.lines.length ? encodeConciergeLink(CONCIERGE_WHATSAPP, { cart: cartInput, quote, event, address, paymentPlan: plan }).url : undefined),
    [cart.lines.length, cartInput, quote, event, address, plan],
  );

  const submit = async (channel: "WEB" | "WHATSAPP", e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    idempotencyKey.current ??= crypto.randomUUID();
    setBusy(channel === "WEB" ? "pay" : "whatsapp");
    try {
      const res = await postJson<BookingResult>("/api/bookings", {
        ...cartInput,
        // Express dispatches today (IST); scheduled orders use the chosen date + slot.
        event: cart.express ? { ...event, slot: "express", date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) } : event,
        address,
        paymentPlan: plan,
        provider,
        channel,
        idempotencyKey: idempotencyKey.current,
      });
      if (!res.ok) {
        if (res.status === 401) return router.push(`/login?next=${encodeURIComponent("/checkout")}`);
        const issues = (res.data as { issues?: { message: string }[] })?.issues;
        setError(issues?.[0]?.message ?? res.error);
        return;
      }
      const booking = res.data;
      setResult(booking);
      cart.clear();
      if (channel === "WHATSAPP") {
        window.open(booking.whatsappUrl, "_blank", "noopener,noreferrer");
        return;
      }
      if (booking.payment) {
        const outcome = await openCheckout(booking.payment);
        if (outcome === "paid") setResult({ ...booking, paid: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment window failed to open");
    } finally {
      setBusy(null);
    }
  };

  if (!hydrated) return <div className="h-96 animate-pulse rounded-glass bg-white/[0.03]" />;
  if (result) return <Confirmation result={result} copied={copied} onCopy={() => setCopied(true)} />;

  if (!cart.lines.length) {
    return (
      <Glass className="mx-auto max-w-lg p-10 text-center">
        <p className="font-display text-2xl font-semibold">Your cart is empty</p>
        <p className="mt-2 text-mist-muted">Design a box or grab an SOS kit to get started.</p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/build">Build a box</ButtonLink>
          <ButtonLink href="/sos" variant="glass">
            SOS kits
          </ButtonLink>
        </div>
      </Glass>
    );
  }

  return (
    <form onSubmit={(e) => submit("WEB", e)} className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-10">
      <div className="space-y-5">
        {/* Cart */}
        <Glass className="p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">Your boxes</h2>
          <ul className="mt-4 divide-y divide-white/10">
            {cart.lines.map((l, i) => (
              <li key={i} className="flex flex-wrap items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{l.label}</p>
                  <p className="truncate text-xs text-mist-faint">
                    {Object.keys(l.spec.items).length} items{l.spec.ribbonText ? ` · “${l.spec.ribbonText}”` : ""} · {formatPaise(quote.lines[i]?.unit ?? 0)}/box
                  </p>
                </div>
                <Stepper value={l.quantity} onChange={(n) => cart.setQuantity(i, n)} label={`Quantity for ${l.label}`} />
                <button type="button" onClick={() => cart.remove(i)} className="grid size-10 place-items-center rounded-full text-mist-faint hover:bg-white/5 hover:text-tangerine" aria-label="Remove">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {DECOR_KITS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => cart.toggleDecor(k.id)}
                aria-pressed={cart.decor.includes(k.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-all",
                  cart.decor.includes(k.id) ? "border-lavender/60 bg-lavender/15 text-lavender-300" : "border-white/10 text-mist-muted hover:border-white/25",
                )}
              >
                {cart.decor.includes(k.id) && <Check className="mr-1 inline size-3" />}
                {k.name} · {formatPaise(k.price)}
              </button>
            ))}
          </div>
        </Glass>

        {/* Event */}
        <Glass className="p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">{cart.express ? "SOS express delivery" : "When & who"}</h2>
          {cart.express ? (
            <p className="mt-2 text-sm text-tangerine-300">Dispatches now — arrives in 60–90 minutes. We&apos;ll confirm hub stock for your PIN code at payment.</p>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {!cart.express && (
              <label className="text-xs text-mist-muted">
                Date
                <input required type="date" className={cn(field, "mt-1.5")} value={event.date} onChange={(e) => setEvent({ ...event, date: e.target.value })} />
              </label>
            )}
            {!cart.express && (
              <label className="text-xs text-mist-muted">
                Delivery slot
                <select className={cn(field, "mt-1.5")} value={event.slot} onChange={(e) => setEvent({ ...event, slot: e.target.value as EventInput["slot"] })}>
                  {SLOTS.map((s) => (
                    <option key={s} value={s} className="bg-obsidian-800">
                      {s.replace("-", " – ")}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs text-mist-muted">
              Guests
              <input required type="number" min={1} max={2000} className={cn(field, "mt-1.5")} value={event.guestCount} onChange={(e) => setEvent({ ...event, guestCount: Number(e.target.value) || 1 })} />
            </label>
            <label className="text-xs text-mist-muted">
              Crowd
              <select className={cn(field, "mt-1.5")} value={event.ageGroup} onChange={(e) => setEvent({ ...event, ageGroup: e.target.value as EventInput["ageGroup"] })}>
                {(["KIDS", "TEENS", "ADULTS", "MIXED"] as const).map((a) => (
                  <option key={a} value={a} className="bg-obsidian-800">
                    {a[0] + a.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-mist-muted sm:col-span-2">
              Theme
              <select className={cn(field, "mt-1.5")} value={event.theme ?? ""} onChange={(e) => setEvent({ ...event, theme: (e.target.value || undefined) as EventInput["theme"] })}>
                <option value="" className="bg-obsidian-800">
                  No theme
                </option>
                {THEMES.map((t) => (
                  <option key={t} value={t} className="bg-obsidian-800">
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-mist-muted sm:col-span-2">
              Notes for the concierge
              <textarea maxLength={500} rows={3} className={cn(field, "mt-1.5 h-auto py-3")} value={event.notes} onChange={(e) => setEvent({ ...event, notes: e.target.value })} placeholder="Allergies, gate codes, surprise instructions…" />
            </label>
          </div>
        </Glass>

        {/* Address */}
        <Glass className="p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">Deliver to</h2>
          <p className="mt-1 text-xs text-mist-faint">Encrypted at rest. Only your delivery partner sees it on the day.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input required autoComplete="name" placeholder="Recipient name" className={field} value={address.recipientName} onChange={(e) => setAddress({ ...address, recipientName: e.target.value })} />
            <input required autoComplete="tel" inputMode="tel" placeholder="Recipient mobile" className={field} value={address.recipientPhone} onChange={(e) => setAddress({ ...address, recipientPhone: e.target.value })} />
            <input required autoComplete="address-line1" placeholder="House / flat, street" className={cn(field, "sm:col-span-2")} value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            <input autoComplete="address-line2" placeholder="Area (optional)" className={field} value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
            <input placeholder="Landmark (optional)" className={field} value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })} />
            <input required autoComplete="address-level2" placeholder="City" className={field} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            <input required autoComplete="postal-code" inputMode="numeric" pattern="\d{6}" placeholder="PIN code" className={field} value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
          </div>
        </Glass>
      </div>

      {/* Summary + payment */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <Glass strong prism className="p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">How would you like to pay?</h2>
          <div className="mt-4 grid gap-2">
            {PLANS.map(({ id, title, body, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPlan(id)}
                aria-pressed={plan === id}
                className={cn("flex items-start gap-3 rounded-2xl border p-3 text-left transition-all", plan === id ? "border-champagne/70 bg-champagne/[0.08]" : "border-white/10 hover:border-white/25")}
              >
                <Icon className={cn("mt-0.5 size-5", plan === id ? "text-champagne" : "text-mist-faint")} />
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-xs text-mist-faint">{body}</span>
                </span>
              </button>
            ))}
          </div>

          {plan !== "SPLIT" && (
            <div className="mt-4 flex gap-2 rounded-full bg-black/30 p-1 text-sm" role="radiogroup" aria-label="Payment provider">
              {(["RAZORPAY", "STRIPE"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={provider === p}
                  onClick={() => setProvider(p)}
                  className={cn("flex-1 rounded-full py-2 font-medium transition-all", provider === p ? "bg-white/10 text-mist" : "text-mist-faint")}
                >
                  {p === "RAZORPAY" ? "UPI · Cards (Razorpay)" : "International card (Stripe)"}
                </button>
              ))}
            </div>
          )}

          <dl className="mt-6 space-y-1.5 text-sm text-mist-muted">
            <Line k={`${quote.totalBoxes} boxes`} v={formatPaise(quote.boxSubtotal)} />
            {quote.discount > 0 && <Line k={`${quote.tier.label} tier`} v={`−${formatPaise(quote.discount)}`} className="text-mint-300" />}
            {quote.decorSubtotal > 0 && <Line k="Decor" v={formatPaise(quote.decorSubtotal)} />}
            {quote.expressFee > 0 && <Line k="SOS express" v={formatPaise(quote.expressFee)} className="text-tangerine-300" />}
            <Line k="GST" v={formatPaise(quote.tax)} />
            <div className="hairline my-2" />
            <Line k="Total" v={formatPaise(quote.total)} className="font-display text-lg font-bold text-mist" />
            <Line k={plan === "SPLIT" ? "Due now" : "Pay now"} v={formatPaise(dueNow)} className="text-champagne" />
          </dl>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-xl border border-tangerine/30 bg-tangerine/10 px-3 py-2 text-sm text-tangerine-300" role="alert">
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {signedIn ? (
            <Button type="submit" size="lg" className="mt-6 w-full" disabled={busy !== null}>
              {busy === "pay" ? "Securing your slot…" : plan === "SPLIT" ? "Create split-pay link" : `Pay ${formatPaise(dueNow)}`}
            </Button>
          ) : (
            <>
              {/* Verify before filling the form, so nothing typed is lost to the login redirect. */}
              <ButtonLink href={`/login?next=${encodeURIComponent("/checkout")}&reason=checkout`} size="lg" className="mt-6 w-full">
                Verify to book
              </ButtonLink>
              <p className="mt-2 text-center text-xs text-mist-faint">A one-time code keeps bookings secure. Your cart is saved.</p>
            </>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            {signedIn ? (
              <Button variant="glass" onClick={() => submit("WHATSAPP")} disabled={busy !== null} className="text-mint-300">
                <MessageCircle className="size-4" /> Book on WhatsApp
              </Button>
            ) : (
              <a href={directWhatsapp} target="_blank" rel="noopener noreferrer" className="glass inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-mint-300">
                <MessageCircle className="size-4" /> WhatsApp brief
              </a>
            )}
            <a href={telUrl(CONCIERGE_PHONE)} className="glass inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold">
              <Phone className="size-4" /> Call concierge
            </a>
          </div>
        </Glass>
      </div>
    </form>
  );
}

function Line({ k, v, className }: { k: string; v: string; className?: string }) {
  return (
    <div className={cn("flex justify-between", className)}>
      <dt>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}

function Confirmation({ result, copied, onCopy }: { result: BookingResult & { paid?: boolean }; copied: boolean; onCopy: () => void }) {
  const share = result.split?.url;
  return (
    <Glass strong prism className="mx-auto max-w-xl p-8 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-champagne">{result.paid ? "Confirmed" : "Reserved"}</p>
      <h2 className="mt-2 font-mono text-3xl font-bold tracking-wide sm:text-4xl">{result.reference}</h2>
      <p className="mt-3 text-mist-muted">
        {result.paid
          ? "Payment received — your celebration is in the queue."
          : share
            ? "Share the link below. We start packing the moment it's fully funded."
            : "We're holding your slot. Complete payment from your dashboard, or finish on WhatsApp."}
      </p>
      {share && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 p-2 pl-4 text-left">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-mist-muted">{share}</span>
          <Button
            size="sm"
            variant="glass"
            onClick={async () => {
              await navigator.clipboard.writeText(share);
              onCopy();
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={`/dashboard/orders/${result.orderId}`} className="inline-flex h-11 items-center rounded-full bg-champagne px-5 text-sm font-semibold text-obsidian">
          Track order
        </Link>
        {share && (
          <a href={`https://wa.me/?text=${encodeURIComponent(`Chip in for our celebration 🎉 ${share}`)}`} target="_blank" rel="noopener noreferrer" className="glass inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-mint-300">
            <MessageCircle className="size-4" /> Share on WhatsApp
          </a>
        )}
        <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" className="glass inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold">
          Message concierge
        </a>
      </div>
    </Glass>
  );
}
