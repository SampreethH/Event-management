import { z } from "zod";
import { DECOR_BY_ID, type DecorKit } from "./catalog";
import { quoteBox, type BoxSpec } from "./box";
import type { Paise } from "./money";

export const THEMES = ["Classic gold", "Neon night", "Pastel garden", "Boho brunch", "Superhero", "Bollywood"] as const;
export type Theme = (typeof THEMES)[number];

export const partyInputSchema = z.object({
  kids: z.number().int().min(0).max(500),
  teens: z.number().int().min(0).max(500),
  adults: z.number().int().min(0).max(500),
  theme: z.enum(THEMES),
  hours: z.number().min(1).max(8),
  withDecor: z.boolean(),
});
export type PartyInput = z.infer<typeof partyInputSchema>;

/**
 * Per-head snack grams for a 3-hour party. Teens out-eat everyone; kids graze.
 * These are starting heuristics — retune them once real fulfilment data exists.
 */
const GRAMS_PER_HEAD = { kids: 170, teens: 320, adults: 250 } as const;
/** Cake grams per slice by group. */
const CAKE_GRAMS = { kids: 70, teens: 110, adults: 90 } as const;
/** Planners without a calculator typically over-order by this factor. */
const TYPICAL_OVERBUY = 1.25;

/** Curated starting recipes per dominant age group, used for the estimate. */
export const STARTER_SPECS: Record<"kids" | "teens" | "adults", BoxSpec> = {
  kids: {
    sleeveId: "sleeve-coral-pop",
    ribbonId: "ribbon-gold-satin",
    ribbonText: "",
    items: { "snack-caramel-popcorn": 1, "snack-masala-makhana": 1, "cake-red-velvet": 1, "conf-vegan-gummies": 1, "favor-bubble-wand": 1 },
  },
  teens: {
    sleeveId: "sleeve-lavender-haze",
    ribbonId: "ribbon-lavender-organza",
    ribbonText: "",
    items: { "snack-nachos-salsa": 1, "snack-veg-sliders": 1, "cake-belgian-chocolate": 1, "conf-chocolate-coins": 1, "favor-glow-sticks": 1 },
  },
  adults: {
    sleeveId: "sleeve-midnight-foil",
    ribbonId: "ribbon-gold-satin",
    ribbonText: "",
    items: { "snack-paneer-puffs": 1, "snack-trail-mix": 1, "cake-almond-orange": 1, "conf-macaron-duo": 1, "favor-mini-candle": 1 },
  },
};

export interface PartyPlan {
  guests: number;
  dominant: "kids" | "teens" | "adults";
  boxes: number;
  bufferBoxes: number;
  snackKg: number;
  cakeKg: number;
  favors: number;
  decor: DecorKit[];
  estimate: { boxes: Paise; decor: Paise; total: Paise; typicalSpend: Paise; saved: Paise };
}

export function planParty(input: PartyInput): PartyPlan {
  const { kids, teens, adults, hours, theme, withDecor } = input;
  const guests = kids + teens + adults;
  const groups = { kids, teens, adults };
  const dominant = (Object.entries(groups) as [keyof typeof groups, number][]).sort((a, b) => b[1] - a[1])[0]![0];

  // Appetite tapers after the first three hours rather than scaling linearly.
  const durationFactor = hours <= 3 ? 0.65 + (0.35 * hours) / 3 : 1 + 0.15 * (hours - 3);
  const snackGrams = (kids * GRAMS_PER_HEAD.kids + teens * GRAMS_PER_HEAD.teens + adults * GRAMS_PER_HEAD.adults) * durationFactor;
  const cakeGrams = kids * CAKE_GRAMS.kids + teens * CAKE_GRAMS.teens + adults * CAKE_GRAMS.adults;

  // ~6% buffer for plus-ones and staff, never less than one spare box once guests exist.
  const bufferBoxes = guests === 0 ? 0 : Math.max(1, Math.ceil(guests * 0.06));
  const boxes = guests + bufferBoxes;
  // Return gifts: every child and teen, and half the adults if it's adult-led.
  const favors = kids + teens + (dominant === "adults" ? Math.ceil(adults * 0.5) : 0);

  const decor: DecorKit[] = [];
  if (withDecor && guests > 0) {
    if (guests <= 15) decor.push(DECOR_BY_ID.get("boho-tabletop")!);
    else if (guests <= 40) decor.push(DECOR_BY_ID.get(theme === "Boho brunch" ? "boho-tabletop" : "neon-backdrop")!);
    else decor.push(DECOR_BY_ID.get("balloon-arch")!, DECOR_BY_ID.get("neon-backdrop")!);
    if (theme === "Neon night" && !decor.some((d) => d.id === "neon-backdrop")) decor.push(DECOR_BY_ID.get("neon-backdrop")!);
  }

  const boxTotal = boxes > 0 ? quoteBox(STARTER_SPECS[dominant], boxes).total : 0;
  const decorTotal = decor.reduce((s, k) => s + k.price, 0);
  const typicalBoxes = Math.ceil(guests * TYPICAL_OVERBUY);
  const typicalSpend = (typicalBoxes > 0 ? quoteBox(STARTER_SPECS[dominant], typicalBoxes).total : 0) + decorTotal;
  const total = boxTotal + decorTotal;

  return {
    guests,
    dominant,
    boxes,
    bufferBoxes,
    snackKg: Math.round(snackGrams / 100) / 10,
    cakeKg: Math.ceil(cakeGrams / 250) / 4, // round up to the nearest quarter-kilo tier
    favors,
    decor,
    estimate: { boxes: boxTotal, decor: decorTotal, total, typicalSpend, saved: Math.max(0, typicalSpend - total) },
  };
}
