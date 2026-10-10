"use client";

import { motion } from "framer-motion";
import { ArrowRight, Cake, Gift, Package, Popcorn, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/domain/money";
import { STARTER_SPECS, THEMES, planParty, type PartyInput } from "@/lib/domain/party-calculator";
import { useBoxBuilder } from "@/stores/box-builder";
import { useCart } from "@/stores/cart";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Stepper } from "@/components/ui/Stepper";

const GROUPS = [
  { key: "kids", label: "Kids", hint: "under 12" },
  { key: "teens", label: "Teens", hint: "12–19" },
  { key: "adults", label: "Adults", hint: "20+" },
] as const;

/**
 * Headcount + age mix + theme → exact box count, snack and cake volume, and the
 * right decor kit, with a comparison against the usual 25% over-order.
 */
export function PartyCalculator() {
  const router = useRouter();
  const loadBox = useBoxBuilder((s) => s.load);
  const cart = useCart();
  const [input, setInput] = useState<PartyInput>({ kids: 18, teens: 0, adults: 10, theme: "Pastel garden", hours: 3, withDecor: true });
  const plan = useMemo(() => planParty(input), [input]);

  const apply = () => {
    const spec = STARTER_SPECS[plan.dominant];
    loadBox(spec, plan.boxes);
    for (const kit of plan.decor) if (!cart.decor.includes(kit.id)) cart.toggleDecor(kit.id);
    router.push("/build");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Glass className="space-y-6 p-6">
        <div className="grid gap-4">
          {GROUPS.map((g) => (
            <div key={g.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{g.label}</p>
                <p className="text-xs text-mist-faint">{g.hint}</p>
              </div>
              <Stepper value={input[g.key]} min={0} max={500} onChange={(n) => setInput({ ...input, [g.key]: n })} label={`${g.label} count`} />
            </div>
          ))}
        </div>
        <div className="hairline" />
        <div>
          <p className="mb-3 text-sm font-semibold">Theme</p>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setInput({ ...input, theme: t })}
                aria-pressed={input.theme === t}
                className={cn("rounded-full border px-3 py-1.5 text-sm transition-all", input.theme === t ? "border-lavender/70 bg-lavender/15 text-lavender-300" : "border-ink/10 text-mist-muted hover:border-ink/25")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-2 flex justify-between text-sm font-semibold">
            Party length <span className="font-normal text-mist-muted tabular-nums">{input.hours} h</span>
          </span>
          <input type="range" min={1} max={8} step={0.5} value={input.hours} onChange={(e) => setInput({ ...input, hours: Number(e.target.value) })} className="w-full accent-champagne" />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-sm font-semibold">Include a decor kit</span>
          <input type="checkbox" checked={input.withDecor} onChange={(e) => setInput({ ...input, withDecor: e.target.checked })} className="size-5 accent-champagne" />
        </label>
      </Glass>

      <Glass strong prism className="flex flex-col p-6">
        <p className="font-sub text-xs uppercase tracking-[0.25em] text-champagne/80">Your plan · {plan.guests} guests</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric icon={<Package className="size-4" />} k="Party boxes" v={String(plan.boxes)} sub={`incl. ${plan.bufferBoxes} spare`} />
          <Metric icon={<Popcorn className="size-4" />} k="Snack volume" v={`${plan.snackKg} kg`} sub={`${input.hours} h party`} />
          <Metric icon={<Cake className="size-4" />} k="Cake" v={`${plan.cakeKg} kg`} sub="one slice each" />
          <Metric icon={<Gift className="size-4" />} k="Return gifts" v={String(plan.favors)} sub={plan.dominant === "adults" ? "for half the adults" : "every kid & teen"} />
        </div>
        {plan.decor.length > 0 && (
          <div className="mt-4 rounded-2xl border border-lavender/30 bg-lavender/10 p-4">
            <p className="text-xs uppercase tracking-wider text-lavender-300">Recommended decor</p>
            <p className="mt-1 font-semibold">{plan.decor.map((d) => d.name).join(" + ")}</p>
          </div>
        )}
        <div className="mt-auto pt-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-mist-faint">Estimated total incl. GST</p>
              <motion.p key={plan.estimate.total} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="font-display text-4xl font-semibold tabular-nums">
                {formatPaise(plan.estimate.total)}
              </motion.p>
            </div>
            {plan.estimate.saved > 0 && (
              <p className="flex items-center gap-1.5 rounded-full bg-mint-300/10 px-3 py-1.5 text-sm font-semibold text-mint-300">
                <Sparkles className="size-4" /> {formatPaise(plan.estimate.saved)} less than over-ordering
              </p>
            )}
          </div>
          <Button size="lg" className="mt-5 w-full" onClick={apply} disabled={plan.guests === 0}>
            Customise these boxes <ArrowRight className="size-5" />
          </Button>
        </div>
      </Glass>
    </div>
  );
}

function Metric({ icon, k, v, sub }: { icon: React.ReactNode; k: string; v: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-ink/[0.03] p-4">
      <p className="flex items-center gap-1.5 text-xs text-mist-faint">
        {icon}
        {k}
      </p>
      <p className="mt-1 font-mono text-3xl font-medium">{v}</p>
      <p className="text-xs text-mist-faint">{sub}</p>
    </div>
  );
}
