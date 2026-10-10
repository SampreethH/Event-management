import { z } from "zod";
import {
  BOX_RULES,
  CATALOG_BY_ID,
  MAX_BOXES_PER_LINE,
  PACKAGING_FEE,
  RIBBON_TEXT_MAX,
  type CatalogItem,
  type Category,
  type Dietary,
} from "./catalog";
import { pct, type Paise } from "./money";

// ─────────────────────────── Spec + validation ───────────────────────────

/** Letters (any script), digits, spaces and a few friendly marks. No markup, no URLs. */
const RIBBON_TEXT = /^[\p{L}\p{N} &!'’.,\-♥★]*$/u;

export const ribbonTextSchema = z
  .string()
  .trim()
  .max(RIBBON_TEXT_MAX)
  .regex(RIBBON_TEXT, "Use letters, numbers and simple punctuation only");

export const boxSpecSchema = z
  .object({
    sleeveId: z.string().max(64),
    ribbonId: z.string().max(64),
    ribbonText: ribbonTextSchema.default(""),
    /** item id → units per box */
    items: z.record(z.string().max(64), z.number().int().min(1).max(4)),
  })
  .superRefine((spec, ctx) => {
    const counts: Record<Category, number> = { sleeve: 0, ribbon: 0, snack: 0, cake: 0, confectionery: 0, favor: 0 };
    const check = (id: string, expected?: Category) => {
      const item = CATALOG_BY_ID.get(id);
      if (!item) {
        ctx.addIssue({ code: "custom", message: `Unknown item: ${id}` });
        return;
      }
      if (expected && item.category !== expected) {
        ctx.addIssue({ code: "custom", message: `${id} is not a ${expected}` });
      }
      return item;
    };
    if (check(spec.sleeveId, "sleeve")) counts.sleeve = 1;
    if (check(spec.ribbonId, "ribbon")) counts.ribbon = 1;
    for (const [id, qty] of Object.entries(spec.items)) {
      const item = check(id);
      if (!item) continue;
      if (item.category === "sleeve" || item.category === "ribbon") {
        ctx.addIssue({ code: "custom", message: "Sleeve and ribbon are chosen separately" });
        continue;
      }
      counts[item.category] += qty;
    }
    for (const [cat, { min, max }] of Object.entries(BOX_RULES) as [Category, { min: number; max: number }][]) {
      if (counts[cat] < min) ctx.addIssue({ code: "custom", message: `Pick at least ${min} ${cat}` });
      if (counts[cat] > max) ctx.addIssue({ code: "custom", message: `At most ${max} ${cat} per box` });
    }
  });

export type BoxSpec = z.infer<typeof boxSpecSchema>;

export const boxQuantitySchema = z.number().int().min(1).max(MAX_BOXES_PER_LINE);

// ─────────────────────────── Dietary badges ───────────────────────────

export interface DietaryBadges extends Dietary {
  /** Item names that trigger the nut alert, for the tooltip. */
  nutSources: string[];
}

export function resolveItems(spec: Pick<BoxSpec, "items">): { item: CatalogItem; qty: number }[] {
  return Object.entries(spec.items).flatMap(([id, qty]) => {
    const item = CATALOG_BY_ID.get(id);
    return item ? [{ item, qty }] : [];
  });
}

/** A box is only Vegan/Eggless/GF if every edible in it is; one nut item raises the alert. */
export function dietaryBadges(spec: Pick<BoxSpec, "items">): DietaryBadges {
  const edibles = resolveItems(spec)
    .map(({ item }) => item)
    .filter((i) => i.category !== "favor");
  const all = (k: keyof Dietary) => edibles.length > 0 && edibles.every((i) => i[k]);
  const nutSources = edibles.filter((i) => i.containsNuts).map((i) => i.name);
  return {
    eggless: all("eggless"),
    vegan: all("vegan"),
    glutenFree: all("glutenFree"),
    containsNuts: nutSources.length > 0,
    nutSources,
  };
}

// ─────────────────────────── Pricing ───────────────────────────

export interface Tier {
  minQty: number;
  rate: number;
  label: string;
}

/** Bulk tiers on the box subtotal. Ordered ascending by minQty. */
export const BULK_TIERS: readonly Tier[] = [
  { minQty: 1, rate: 0, label: "Single" },
  { minQty: 10, rate: 0.05, label: "Gathering" },
  { minQty: 25, rate: 0.1, label: "Party" },
  { minQty: 50, rate: 0.15, label: "Celebration" },
  { minQty: 100, rate: 0.2, label: "Festival" },
];

export const FOOD_GST = 0.05;
export const SERVICE_GST = 0.18;

export function tierFor(qty: number): { current: Tier; next?: Tier } {
  let idx = 0;
  BULK_TIERS.forEach((t, i) => {
    if (qty >= t.minQty) idx = i;
  });
  return { current: BULK_TIERS[idx]!, next: BULK_TIERS[idx + 1] };
}

export function unitPrice(spec: BoxSpec): Paise {
  const sleeve = CATALOG_BY_ID.get(spec.sleeveId)?.price ?? 0;
  const ribbon = CATALOG_BY_ID.get(spec.ribbonId)?.price ?? 0;
  const contents = resolveItems(spec).reduce((sum, { item, qty }) => sum + item.price * qty, 0);
  return PACKAGING_FEE + sleeve + ribbon + contents;
}

export interface BoxQuote {
  unit: Paise;
  quantity: number;
  subtotal: Paise;
  tier: Tier;
  nextTier?: Tier & { boxesAway: number; unitAtNext: Paise };
  discount: Paise;
  tax: Paise;
  total: Paise;
  perBoxEffective: Paise;
}

export function quoteBox(spec: BoxSpec, quantity: number): BoxQuote {
  const unit = unitPrice(spec);
  const subtotal = unit * quantity;
  const { current, next } = tierFor(quantity);
  const discount = pct(subtotal, current.rate);
  const tax = pct(subtotal - discount, FOOD_GST);
  const total = subtotal - discount + tax;
  return {
    unit,
    quantity,
    subtotal,
    tier: current,
    nextTier: next && {
      ...next,
      boxesAway: next.minQty - quantity,
      unitAtNext: Math.round(unit * (1 - next.rate) * (1 + FOOD_GST)),
    },
    discount,
    tax,
    total,
    perBoxEffective: Math.round(total / quantity),
  };
}
