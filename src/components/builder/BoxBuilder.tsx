"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, MessageCircle, ShoppingBag, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { BOX_RULES, CATALOG_BY_ID, RIBBON_TEXT_MAX, byCategory, type Category } from "@/lib/domain/catalog";
import { BULK_TIERS, boxSpecSchema, dietaryBadges, quoteBox, ribbonTextSchema } from "@/lib/domain/box";
import { formatPaise } from "@/lib/domain/money";
import { quoteOrder } from "@/lib/booking/quote";
import { encodeConciergeLink } from "@/lib/booking/whatsapp";
import { CONCIERGE_WHATSAPP } from "@/lib/public-config";
import { useBoxBuilder } from "@/stores/box-builder";
import { useCart } from "@/stores/cart";
import { toPreviewItems } from "@/components/three/preview";
import { Button } from "@/components/ui/Button";
import { DietaryBadges } from "@/components/ui/DietaryBadges";
import { Glass } from "@/components/ui/Glass";
import { Stepper } from "@/components/ui/Stepper";

// Code-split: the three.js bundle only loads on pages that show the box.
const LuxuryPartyBox = dynamic(() => import("@/components/three/LuxuryPartyBox"), {
  ssr: false,
  loading: () => <div className="aspect-square w-full animate-pulse bg-white/[0.03] sm:aspect-[5/4]" />,
});

const STEPS: { category: Exclude<Category, "sleeve" | "ribbon">; title: string; hint: string }[] = [
  { category: "snack", title: "Snacks", hint: "Pick up to 4" },
  { category: "cake", title: "Cake tier", hint: "Optional, one per box" },
  { category: "confectionery", title: "Confectionery", hint: "Up to 2" },
  { category: "favor", title: "Return gifts", hint: "Up to 2" },
];

export function BoxBuilder() {
  const router = useRouter();
  const { spec, quantity, notice, setSleeve, setRibbon, setRibbonText, toggleItem, setQuantity } = useBoxBuilder();
  const addToCart = useCart((s) => s.add);
  const [status, setStatus] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const sleeve = CATALOG_BY_ID.get(spec.sleeveId)!;
  const ribbon = CATALOG_BY_ID.get(spec.ribbonId)!;
  const validation = useMemo(() => boxSpecSchema.safeParse(spec), [spec]);
  const badges = useMemo(() => dietaryBadges(spec), [spec]);
  const quote = useMemo(() => quoteBox(spec, quantity), [spec, quantity]);
  const previewItems = useMemo(() => toPreviewItems(spec), [spec]);
  const label = spec.ribbonText.trim() ? "Custom box" : `${sleeve.name} box`;

  const ribbonTextError = useMemo(() => {
    const r = ribbonTextSchema.safeParse(spec.ribbonText);
    return r.success ? null : r.error.issues[0]?.message;
  }, [spec.ribbonText]);

  const handleAdd = () => {
    if (!validation.success) return;
    addToCart({ label, spec: validation.data, quantity });
    setStatus({ tone: "ok", text: `${quantity} boxes added to your cart` });
  };

  const handleSave = async () => {
    if (!validation.success) return;
    setSaving(true);
    try {
      const res = await fetch("/api/boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: label, spec: validation.data }),
      });
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/build")}&reason=save`);
        return;
      }
      setStatus(res.ok ? { tone: "ok", text: "Saved to My Celebrations" } : { tone: "warn", text: "Couldn't save right now — try again" });
    } finally {
      setSaving(false);
    }
  };

  const whatsappHref = useMemo(() => {
    if (!validation.success) return undefined;
    const cart = { lines: [{ label, spec: validation.data, quantity }], decor: [], express: false };
    return encodeConciergeLink(CONCIERGE_WHATSAPP, { cart, quote: quoteOrder(cart) }).url;
  }, [validation, label, quantity]);

  const nextTier = quote.nextTier;
  const tierIdx = BULK_TIERS.findIndex((t) => t.label === quote.tier.label);
  const tierProgress = nextTier ? (quantity - quote.tier.minQty) / (nextTier.minQty - quote.tier.minQty) : 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
      {/* ── Live preview ── */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <Glass prism className="overflow-hidden p-0">
          <LuxuryPartyBox
            className="aspect-square h-auto rounded-none border-0 sm:aspect-[5/4]"
            boxColor={sleeve.color}
            ribbonColor={ribbon.color}
            label={spec.ribbonText}
            items={previewItems}
            defaultOpen
          />
          <div className="space-y-4 border-t border-white/10 p-5 sm:p-6">
            <DietaryBadges badges={badges} />
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-mist-faint">Per box, incl. GST</p>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.p
                    key={quote.perBoxEffective}
                    initial={{ y: 12, opacity: 0, filter: "blur(4px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: -12, opacity: 0, filter: "blur(4px)" }}
                    transition={{ duration: 0.25 }}
                    className="font-display text-4xl font-bold tabular-nums text-mist"
                  >
                    {formatPaise(quote.perBoxEffective)}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="text-right">
                <p className="text-xs text-mist-faint">{quantity} boxes</p>
                <p className="font-display text-xl font-semibold tabular-nums text-champagne">{formatPaise(quote.total)}</p>
                {quote.discount > 0 && <p className="text-xs text-mint-300">You save {formatPaise(quote.discount)}</p>}
              </div>
            </div>
          </div>
        </Glass>
      </div>

      {/* ── Configuration steps ── */}
      <div className="space-y-5">
        <Glass className="p-5 sm:p-6">
          <StepTitle n={1} title="Sleeve" hint="The printed outer wrap" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {byCategory("sleeve").map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSleeve(s.id)}
                aria-pressed={spec.sleeveId === s.id}
                className={cn(
                  "group rounded-2xl border p-3 text-left transition-all",
                  spec.sleeveId === s.id ? "border-champagne/70 bg-champagne/10" : "border-white/10 hover:border-white/25",
                )}
              >
                <span className="mb-3 block h-14 rounded-xl" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color} 55%, ${s.accent})` }} />
                <span className="block text-sm font-semibold">{s.name}</span>
                <span className="text-xs text-mist-faint">{s.price ? `+${formatPaise(s.price)}` : "Included"}</span>
              </button>
            ))}
          </div>
        </Glass>

        <Glass className="p-5 sm:p-6">
          <StepTitle n={2} title="Ribbon & message" hint="Printed on the sleeve band" />
          <div className="mt-4 flex flex-wrap gap-3">
            {byCategory("ribbon").map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRibbon(r.id)}
                aria-pressed={spec.ribbonId === r.id}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all",
                  spec.ribbonId === r.id ? "border-champagne/70 bg-champagne/10" : "border-white/10 hover:border-white/25",
                )}
              >
                <span className="size-4 rounded-full ring-1 ring-white/20" style={{ background: r.color }} />
                {r.name}
                {r.price > 0 && <span className="text-xs text-mist-faint">+{formatPaise(r.price)}</span>}
              </button>
            ))}
          </div>
          <label className="mt-5 block">
            <span className="mb-2 flex justify-between text-xs text-mist-muted">
              <span>Ribbon text</span>
              <span className="tabular-nums">
                {spec.ribbonText.length}/{RIBBON_TEXT_MAX}
              </span>
            </span>
            <input
              value={spec.ribbonText}
              onChange={(e) => setRibbonText(e.target.value)}
              maxLength={RIBBON_TEXT_MAX}
              placeholder="Aanya turns 7 ★"
              className="glass h-12 w-full rounded-2xl px-4 font-display text-lg outline-none placeholder:text-mist-faint focus:border-champagne/60"
              aria-invalid={Boolean(ribbonTextError)}
            />
            {ribbonTextError && <span className="mt-1.5 block text-xs text-tangerine-300">{ribbonTextError}</span>}
          </label>
        </Glass>

        {STEPS.map((step, i) => {
          const chosen = Object.keys(spec.items).filter((id) => CATALOG_BY_ID.get(id)?.category === step.category).length;
          return (
            <Glass key={step.category} id={step.category === "favor" ? "favors" : undefined} className="scroll-mt-32 p-5 sm:p-6">
              <StepTitle n={i + 3} title={step.title} hint={`${step.hint} · ${chosen}/${BOX_RULES[step.category].max}`} />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {byCategory(step.category).map((item) => {
                  const selected = Boolean(spec.items[item.id]);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      aria-pressed={selected}
                      className={cn(
                        "relative flex items-start gap-3 rounded-2xl border p-3 text-left transition-all",
                        selected ? "border-champagne/70 bg-champagne/[0.08]" : "border-white/10 hover:border-white/25 hover:bg-white/[0.03]",
                      )}
                    >
                      <span className="mt-0.5 size-10 shrink-0 rounded-xl ring-1 ring-white/15" style={{ background: `radial-gradient(circle at 30% 30%, #ffffff55, ${item.color} 60%)` }} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-tight">{item.name}</span>
                        <span className="mt-0.5 block text-xs text-mist-faint">{item.blurb}</span>
                        <span className="mt-2 flex flex-wrap items-center gap-1.5 font-sub text-[10px] font-semibold uppercase tracking-wider">
                          <span className="text-mist-muted">{formatPaise(item.price)}</span>
                          {item.vegan && <span className="rounded bg-mint-300/10 px-1.5 py-0.5 text-mint-300">Vegan</span>}
                          {!item.eggless && <span className="rounded bg-white/5 px-1.5 py-0.5 text-mist-muted">Egg</span>}
                          {item.glutenFree && <span className="rounded bg-lavender/10 px-1.5 py-0.5 text-lavender-300">GF</span>}
                          {item.containsNuts && <span className="rounded bg-tangerine/15 px-1.5 py-0.5 text-tangerine-300">Nuts</span>}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full border transition-all",
                          selected ? "border-champagne bg-champagne text-obsidian" : "border-white/20",
                        )}
                        aria-hidden
                      >
                        {selected && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Glass>
          );
        })}

        {/* ── Quantity, tiers, actions ── */}
        <Glass strong prism className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-lg font-semibold">How many boxes?</p>
              <p className="text-sm text-mist-muted">Bulk tiers apply automatically.</p>
            </div>
            <Stepper value={quantity} onChange={setQuantity} label="Box quantity" />
          </div>

          <div className="mt-6">
            <div className="flex justify-between font-mono text-[11px] uppercase text-mist-faint">
              {BULK_TIERS.map((t, i) => (
                <span key={t.label} className={cn(i <= tierIdx && "text-champagne")}>
                  {t.minQty}+ · {Math.round(t.rate * 100)}%
                </span>
              ))}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-champagne via-tangerine to-lavender"
                animate={{ width: `${((tierIdx + Math.min(1, tierProgress)) / BULK_TIERS.length) * 100}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
            {nextTier && (
              <p className="mt-3 flex items-center gap-2 text-sm text-mist-muted">
                <Sparkles className="size-4 text-champagne" />
                Add <b className="text-mist">{nextTier.boxesAway}</b> more for the {nextTier.label} tier — {formatPaise(nextTier.unitAtNext)}/box.
              </p>
            )}
          </div>

          <dl className="mt-6 space-y-1.5 text-sm">
            <Row k={`${quantity} × ${formatPaise(quote.unit)}`} v={formatPaise(quote.subtotal)} />
            {quote.discount > 0 && <Row k={`${quote.tier.label} tier −${Math.round(quote.tier.rate * 100)}%`} v={`−${formatPaise(quote.discount)}`} accent />}
            <Row k="GST (5%)" v={formatPaise(quote.tax)} />
            <div className="hairline my-2" />
            <Row k="Total" v={formatPaise(quote.total)} strong />
          </dl>

          {!validation.success && (
            <p className="mt-4 rounded-xl border border-tangerine/30 bg-tangerine/10 px-3 py-2 text-sm text-tangerine-300">{validation.error.issues[0]?.message}</p>
          )}
          <AnimatePresence>
            {(notice || status) && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn("mt-4 text-sm", notice || status?.tone === "warn" ? "text-tangerine-300" : "text-mint-300")}
                role="status"
              >
                {notice ?? status?.text}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Button variant="gold" size="lg" onClick={handleAdd} disabled={!validation.success} className="sm:col-span-3">
              <ShoppingBag className="size-5" /> Add to cart
            </Button>
            <Button variant="glass" onClick={handleSave} disabled={!validation.success || saving}>
              {saving ? "Saving…" : "Save design"}
            </Button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!whatsappHref}
              className="glass col-span-1 inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-mint-300 hover:border-mint-300/40 sm:col-span-2"
            >
              <MessageCircle className="size-4" /> Send spec to concierge
            </a>
          </div>
        </Glass>
      </div>
    </div>
  );
}

function StepTitle({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-sm font-medium text-champagne/80">{String(n).padStart(2, "0")}</span>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <span className="ml-auto text-xs text-mist-faint">{hint}</span>
    </div>
  );
}

function Row({ k, v, strong, accent }: { k: string; v: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className={cn("flex justify-between", strong ? "font-display text-lg font-bold" : "text-mist-muted", accent && "text-mint-300")}>
      <dt>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
