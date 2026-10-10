import type { Paise } from "./money";

/**
 * Source of truth for box components and decor kits. `prisma/seed.ts` syncs this
 * into CatalogItem/DecorKit so inventory and order lines can reference stable ids,
 * and the server prices every booking from here rather than from client input.
 */

export type Category = "sleeve" | "ribbon" | "snack" | "cake" | "confectionery" | "favor";

export interface Dietary {
  eggless: boolean;
  vegan: boolean;
  glutenFree: boolean;
  containsNuts: boolean;
}

export interface CatalogItem extends Dietary {
  id: string;
  category: Category;
  name: string;
  blurb: string;
  price: Paise; // per box
  /** Visual hints for the 3D preview and swatches. */
  color: string;
  accent?: string;
  /** Can go out on the 60–90 minute SOS express run. */
  express?: boolean;
}

const D = (o: Partial<Dietary> = {}): Dietary => ({
  eggless: true,
  vegan: false,
  glutenFree: false,
  containsNuts: false,
  ...o,
});

export const CATALOG: readonly CatalogItem[] = [
  // Sleeves — the outer printed wrap. Packaging only, so dietary-neutral.
  { id: "sleeve-midnight-foil", category: "sleeve", name: "Midnight Foil", blurb: "Obsidian board, hot-foil gold confetti.", price: 0, color: "#14152A", accent: "#F5D061", ...D({ vegan: true, glutenFree: true }) },
  { id: "sleeve-coral-pop", category: "sleeve", name: "Coral Pop", blurb: "Neon coral with cream risograph dots.", price: 2000, color: "#FF5E5B", accent: "#F9E29A", ...D({ vegan: true, glutenFree: true }) },
  { id: "sleeve-lavender-haze", category: "sleeve", name: "Lavender Haze", blurb: "Holographic lavender, pearl edge.", price: 2000, color: "#A78BFA", accent: "#FFFFFF", ...D({ vegan: true, glutenFree: true }) },
  { id: "sleeve-champagne-pleat", category: "sleeve", name: "Champagne Pleat", blurb: "Pleated gold with a debossed monogram.", price: 3500, color: "#E9C25A", accent: "#050608", ...D({ vegan: true, glutenFree: true }) },
  { id: "sleeve-kraft-boho", category: "sleeve", name: "Kraft Boho", blurb: "Recycled kraft, block-printed terracotta.", price: 1500, color: "#C8A27A", accent: "#6B3A22", ...D({ vegan: true, glutenFree: true }) },

  // Ribbons
  { id: "ribbon-gold-satin", category: "ribbon", name: "Gold satin", blurb: "", price: 0, color: "#F5D061", ...D({ vegan: true, glutenFree: true }) },
  { id: "ribbon-coral-grosgrain", category: "ribbon", name: "Coral grosgrain", blurb: "", price: 0, color: "#FF5E5B", ...D({ vegan: true, glutenFree: true }) },
  { id: "ribbon-lavender-organza", category: "ribbon", name: "Lavender organza", blurb: "", price: 800, color: "#C9B8FD", ...D({ vegan: true, glutenFree: true }) },
  { id: "ribbon-ivory-silk", category: "ribbon", name: "Ivory silk", blurb: "", price: 1500, color: "#F4EFE6", ...D({ vegan: true, glutenFree: true }) },

  // Snacks
  { id: "snack-masala-makhana", category: "snack", name: "Peri-peri makhana", blurb: "Roasted fox nuts, smoky peri-peri.", price: 6000, color: "#E8D5A8", express: true, ...D({ vegan: true, glutenFree: true }) },
  { id: "snack-nachos-salsa", category: "snack", name: "Baked nachos & salsa", blurb: "Stone-ground corn chips, roasted salsa cup.", price: 7000, color: "#F2B84B", express: true, ...D({ vegan: true, glutenFree: true }) },
  { id: "snack-paneer-puffs", category: "snack", name: "Mini paneer puffs", blurb: "Flaky laminated pastry, tikka paneer.", price: 8500, color: "#E9A15B", ...D() },
  { id: "snack-trail-mix", category: "snack", name: "Jaggery trail mix", blurb: "Almonds, cashews, jaggery clusters.", price: 9000, color: "#B9814E", express: true, ...D({ vegan: true, glutenFree: true, containsNuts: true }) },
  { id: "snack-caramel-popcorn", category: "snack", name: "Salted caramel popcorn", blurb: "Small-batch, butter caramel.", price: 5500, color: "#F5D9A0", express: true, ...D({ glutenFree: true }) },
  { id: "snack-veg-sliders", category: "snack", name: "Veg sliders (2)", blurb: "Brioche, beet-patty, chipotle mayo.", price: 11000, color: "#C65F3B", ...D() },

  // Cakes (one slice/tier per box)
  { id: "cake-belgian-chocolate", category: "cake", name: "Belgian chocolate tier", blurb: "70% couverture, ganache crown.", price: 9500, color: "#4A2A1E", express: true, ...D({ eggless: false }) },
  { id: "cake-red-velvet", category: "cake", name: "Eggless red velvet", blurb: "Cream cheese frosting, beet-red crumb.", price: 9000, color: "#9E2B3B", express: true, ...D() },
  { id: "cake-almond-orange", category: "cake", name: "Almond–orange (vegan, GF)", blurb: "Flourless almond sponge, candied peel.", price: 11000, color: "#F0A04B", ...D({ vegan: true, glutenFree: true, containsNuts: true }) },
  { id: "cake-mango-tres-leches", category: "cake", name: "Mango tres leches", blurb: "Alphonso soak, chantilly.", price: 10000, color: "#F7C548", ...D({ eggless: false }) },

  // Confectionery
  { id: "conf-macaron-duo", category: "confectionery", name: "Macaron duo", blurb: "Rose-lychee & salted caramel.", price: 8000, color: "#F4B6C2", ...D({ eggless: false, glutenFree: true, containsNuts: true }) },
  { id: "conf-chocolate-coins", category: "confectionery", name: "Gold chocolate coins tin", blurb: "Milk chocolate, foil-wrapped.", price: 6000, color: "#F5D061", express: true, ...D({ glutenFree: true }) },
  { id: "conf-kaju-katli", category: "confectionery", name: "Silver-leaf kaju katli tin", blurb: "Cashew fudge, edible silver.", price: 9000, color: "#E6E1D6", express: true, ...D({ glutenFree: true, containsNuts: true }) },
  { id: "conf-vegan-gummies", category: "confectionery", name: "Fruit gummies", blurb: "Pectin-set, real fruit.", price: 5000, color: "#FF5E5B", express: true, ...D({ vegan: true, glutenFree: true }) },

  // Return-gift favors
  { id: "favor-bubble-wand", category: "favor", name: "Giant bubble wand", blurb: "Refillable, ages 3+.", price: 6000, color: "#9ED8F7", express: true, ...D({ vegan: true, glutenFree: true }) },
  { id: "favor-seed-cards", category: "favor", name: "Seed-paper confetti cards", blurb: "Plant them; marigolds grow.", price: 4500, color: "#9BC47A", ...D({ vegan: true, glutenFree: true }) },
  { id: "favor-mini-candle", category: "favor", name: "Mini soy candle", blurb: "Fig & amber, 60g tin.", price: 9500, color: "#D9B98C", ...D({ vegan: true, glutenFree: true }) },
  { id: "favor-tote", category: "favor", name: "Personalised tote", blurb: "Screen-printed with the ribbon text.", price: 15000, color: "#EDE6D8", ...D({ vegan: true, glutenFree: true }) },
  { id: "favor-glow-sticks", category: "favor", name: "Glow bracelet pack", blurb: "Five neon bracelets.", price: 3000, color: "#B6FF6B", express: true, ...D({ vegan: true, glutenFree: true }) },
] as const;

export const CATALOG_BY_ID: ReadonlyMap<string, CatalogItem> = new Map(CATALOG.map((i) => [i.id, i]));

export function byCategory(category: Category): CatalogItem[] {
  return CATALOG.filter((i) => i.category === category);
}

/** How many of each category a single box may hold. */
export const BOX_RULES: Record<Category, { min: number; max: number }> = {
  sleeve: { min: 1, max: 1 },
  ribbon: { min: 1, max: 1 },
  snack: { min: 1, max: 4 },
  cake: { min: 0, max: 1 },
  confectionery: { min: 0, max: 2 },
  favor: { min: 0, max: 2 },
};

export const PACKAGING_FEE: Paise = 4000; // rigid box, tissue, assembly
export const MAX_BOXES_PER_LINE = 1000;
export const RIBBON_TEXT_MAX = 28;

// ─────────────────────────── Decor kits ───────────────────────────

export interface DecorKit {
  id: "balloon-arch" | "neon-backdrop" | "boho-tabletop";
  name: string;
  blurb: string;
  price: Paise;
  setupMinutes: number;
  /** Footprint in metres (w × d × h) for the room visualizer. */
  footprint: { w: number; d: number; h: number };
}

export const DECOR_KITS: readonly DecorKit[] = [
  { id: "balloon-arch", name: "Organic balloon arch", blurb: "180 balloons in a chrome-and-pastel gradient, free-standing frame.", price: 649900, setupMinutes: 90, footprint: { w: 2.6, d: 0.6, h: 2.3 } },
  { id: "neon-backdrop", name: "Neon backdrop wall", blurb: "Custom LED neon script on a 2.4 m velvet panel with fairy-light fringe.", price: 899900, setupMinutes: 60, footprint: { w: 2.4, d: 0.4, h: 2.2 } },
  { id: "boho-tabletop", name: "Minimal boho tabletop", blurb: "Pampas, rattan chargers, linen runner, 12 pillar candles.", price: 449900, setupMinutes: 45, footprint: { w: 1.8, d: 0.9, h: 1.1 } },
] as const;

export const DECOR_BY_ID: ReadonlyMap<string, DecorKit> = new Map(DECOR_KITS.map((k) => [k.id, k]));
