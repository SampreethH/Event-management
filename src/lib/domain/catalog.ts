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
  /** House specials that set a Festoon box apart; badged in the builder. */
  signature?: boolean;
}

const D = (o: Partial<Dietary> = {}): Dietary => ({
  eggless: true,
  vegan: false,
  glutenFree: false,
  containsNuts: false,
  ...o,
});

const PACKAGING = D({ vegan: true, glutenFree: true });

export const CATALOG: readonly CatalogItem[] = [
  // Sleeves — plain board colours stocked by Bengaluru gift-box suppliers. Packaging only, so dietary-neutral.
  { id: "sleeve-kraft", category: "sleeve", name: "Kraft brown", blurb: "Natural recycled kraft board.", price: 0, color: "#B98B5E", accent: "#8A6440", ...PACKAGING },
  { id: "sleeve-white", category: "sleeve", name: "White", blurb: "Matte white board.", price: 0, color: "#F6F4EF", accent: "#E3DED3", ...PACKAGING },
  { id: "sleeve-red", category: "sleeve", name: "Red", blurb: "Festive red board.", price: 500, color: "#C62828", accent: "#9E1F1F", ...PACKAGING },
  { id: "sleeve-pink", category: "sleeve", name: "Pink", blurb: "Rani pink board.", price: 500, color: "#E3418A", accent: "#B92F6D", ...PACKAGING },
  { id: "sleeve-yellow", category: "sleeve", name: "Yellow", blurb: "Sunny yellow board.", price: 500, color: "#F6C324", accent: "#D9A60F", ...PACKAGING },
  { id: "sleeve-blue", category: "sleeve", name: "Royal blue", blurb: "Royal blue board.", price: 500, color: "#1F4FA8", accent: "#163A7D", ...PACKAGING },
  { id: "sleeve-black", category: "sleeve", name: "Black & gold", blurb: "Black board, gold foil print.", price: 1000, color: "#14141A", accent: "#D4AF37", ...PACKAGING },
  { id: "sleeve-gold", category: "sleeve", name: "Gold", blurb: "Metallic gold board.", price: 1000, color: "#D4AF37", accent: "#A8862A", ...PACKAGING },

  // Ribbons
  { id: "ribbon-gold-satin", category: "ribbon", name: "Gold satin", blurb: "", price: 0, color: "#D4AF37", ...PACKAGING },
  { id: "ribbon-red-satin", category: "ribbon", name: "Red satin", blurb: "", price: 0, color: "#C62828", ...PACKAGING },
  { id: "ribbon-pink-satin", category: "ribbon", name: "Pink satin", blurb: "", price: 0, color: "#F48FB1", ...PACKAGING },
  { id: "ribbon-white-satin", category: "ribbon", name: "White satin", blurb: "", price: 0, color: "#F4EFE6", ...PACKAGING },

  // Snacks — savouries and bakery bites
  { id: "snack-salted-chips", category: "snack", name: "Salted potato chips", blurb: "Classic salted, 30 g pouch.", price: 1500, color: "#F2D16B", express: true, ...D({ vegan: true, glutenFree: true }) },
  { id: "snack-peri-peri-chips", category: "snack", name: "Peri-peri chips", blurb: "Tangy peri-peri dusted, 30 g.", price: 1500, color: "#E8743B", express: true, ...D({ vegan: true, glutenFree: true }) },
  { id: "snack-chilli-chips", category: "snack", name: "Red chilli masala chips", blurb: "Desi red chilli powder masala, 30 g.", price: 1500, color: "#C8412E", express: true, ...D({ vegan: true, glutenFree: true }) },
  { id: "snack-banana-chips", category: "snack", name: "Banana chips", blurb: "Kerala-style, fried in coconut oil.", price: 2000, color: "#E9C46A", express: true, ...D({ vegan: true, glutenFree: true }) },
  { id: "snack-samosa", category: "snack", name: "Aloo samosa", blurb: "Spiced potato and peas, with green chutney.", price: 1500, color: "#D9A05B", express: true, ...D({ vegan: true }) },
  { id: "snack-peri-peri-samosa", category: "snack", name: "Peri-peri samosa", blurb: "Our samosa with a peri-peri kick.", price: 1800, color: "#D2703C", express: true, ...D({ vegan: true }) },
  { id: "snack-kachori", category: "snack", name: "Moong dal kachori", blurb: "Flaky, spiced moong dal filling.", price: 1500, color: "#C98B45", express: true, ...D({ vegan: true }) },
  { id: "snack-veg-puff", category: "snack", name: "Veg puff", blurb: "Bengaluru bakery classic, masala filling.", price: 2500, color: "#E2A857", express: true, ...D() },
  { id: "snack-khara-mixture", category: "snack", name: "Khara mixture", blurb: "Spicy sev, boondi and peanuts.", price: 1500, color: "#D9A441", express: true, ...D({ vegan: true, containsNuts: true }) },
  { id: "snack-congress-kadlekai", category: "snack", name: "Congress kadlekai", blurb: "Bengaluru's spicy roasted peanuts.", price: 1500, color: "#B8763E", express: true, ...D({ vegan: true, glutenFree: true, containsNuts: true }) },
  { id: "snack-rusk", category: "snack", name: "Milk rusk (2)", blurb: "Crisp, twice-baked tea-time rusk.", price: 1000, color: "#D6A15E", express: true, ...D() },
  { id: "snack-jam-bun", category: "snack", name: "Jam bun", blurb: "Soft bun with mixed-fruit jam.", price: 1500, color: "#C2453C", express: true, ...D() },
  { id: "snack-cream-bun-chocolate", category: "snack", name: "Chocolate cream bun", blurb: "Bakery bun, chocolate cream filling.", price: 2000, color: "#6B3F2A", express: true, ...D() },
  { id: "snack-cream-bun-vanilla", category: "snack", name: "Vanilla cream bun", blurb: "Bakery bun, vanilla cream filling.", price: 2000, color: "#F3E3C3", express: true, ...D() },
  { id: "snack-pani-puri-kit", category: "snack", name: "DIY pani puri kit", blurb: "Puris, masala filling and sealed pani. Kids assemble their own.", price: 4500, color: "#8DBF5A", signature: true, ...D({ vegan: true }) },

  // Cakes (one slice per box)
  { id: "cake-plain-vanilla", category: "cake", name: "Plain vanilla cake", blurb: "Soft eggless tea-cake slice.", price: 2500, color: "#F1D9A6", express: true, ...D() },
  { id: "cake-plain-chocolate", category: "cake", name: "Plain chocolate cake", blurb: "Eggless cocoa sponge slice.", price: 3000, color: "#5A3424", express: true, ...D() },
  { id: "cake-honey", category: "cake", name: "Honey cake", blurb: "Iyengar-bakery style, honey, jam and coconut.", price: 3000, color: "#D98F3A", express: true, ...D() },

  // Sweets & chocolates
  { id: "conf-chocolate-bar", category: "confectionery", name: "Milk chocolate bar", blurb: "Small milk chocolate bar.", price: 2000, color: "#6B3F2A", express: true, ...D({ glutenFree: true }) },
  { id: "conf-eclairs", category: "confectionery", name: "Chocolate éclairs (3)", blurb: "Caramel toffees with a chocolate centre.", price: 1000, color: "#7A4A2A", express: true, ...D({ glutenFree: true }) },
  { id: "conf-jalebi", category: "confectionery", name: "Jalebi (2)", blurb: "Crisp, syrup-soaked, packed in a leak-proof cup.", price: 2000, color: "#F29F05", express: true, ...D() },
  { id: "conf-mysore-pak", category: "confectionery", name: "Mysore pak", blurb: "Karnataka's ghee-rich besan sweet.", price: 2500, color: "#E8B04B", express: true, ...D({ glutenFree: true }) },
  { id: "conf-gulab-jamun", category: "confectionery", name: "Gulab jamun (2)", blurb: "In a sealed cup.", price: 2500, color: "#8B3A1E", express: true, ...D() },
  { id: "conf-kaju-katli", category: "confectionery", name: "Kaju katli", blurb: "Cashew fudge with silver leaf.", price: 4000, color: "#E6E1D6", express: true, ...D({ glutenFree: true, containsNuts: true }) },
  { id: "conf-name-chocolate", category: "confectionery", name: "Personalised name chocolate", blurb: "Wrapper printed with the guest of honour's name and your ribbon message.", price: 5000, color: "#D4AF37", signature: true, ...D({ glutenFree: true }) },

  // Return gifts — go inside a snack box, or on their own in a return-gift box
  { id: "favor-channapatna-toy", category: "favor", name: "Channapatna wooden toy", blurb: "GI-tagged lacquered wooden toy from Karnataka.", price: 15000, color: "#E0483E", ...PACKAGING },
  { id: "favor-stationery-kit", category: "favor", name: "Stationery kit", blurb: "Pencil box, pencils, eraser and sharpener.", price: 8000, color: "#4C8BF5", express: true, ...PACKAGING },
  { id: "favor-colouring-kit", category: "favor", name: "Colouring book & crayons", blurb: "24-page book, 12 crayons.", price: 6000, color: "#F5B700", express: true, ...PACKAGING },
  { id: "favor-steel-bottle", category: "favor", name: "Steel water bottle", blurb: "500 ml, leak-proof, name sticker.", price: 18000, color: "#A7B1BC", ...PACKAGING },
  { id: "favor-jute-bag", category: "favor", name: "Printed jute bag", blurb: "Printed with your ribbon message.", price: 9000, color: "#C8A27A", ...PACKAGING },
  { id: "favor-seed-pencils", category: "favor", name: "Plantable seed pencils (5)", blurb: "Plant the stub; it grows into a herb.", price: 7000, color: "#9BC47A", ...PACKAGING },
  { id: "favor-bubble-wand", category: "favor", name: "Bubble wand", blurb: "Refillable, ages 3+.", price: 5000, color: "#9ED8F7", express: true, ...PACKAGING },
  { id: "favor-glow-sticks", category: "favor", name: "Glow bracelet pack", blurb: "Five neon bracelets.", price: 3000, color: "#B6FF6B", express: true, ...PACKAGING },
] as const;

export const CATALOG_BY_ID: ReadonlyMap<string, CatalogItem> = new Map(CATALOG.map((i) => [i.id, i]));

export function byCategory(category: Category): CatalogItem[] {
  return CATALOG.filter((i) => i.category === category);
}

/**
 * Two kinds of box. A snack box carries food (and may tuck in a return gift);
 * a return-gift box carries gifts only. The kind is derived from the contents —
 * a box with no edibles is a return-gift box — so it never needs storing.
 */
export type BoxKind = "snack" | "gift";

export const EDIBLE_CATEGORIES: readonly Category[] = ["snack", "cake", "confectionery"];

/** How many of each category a single box may hold, per kind. */
export const BOX_RULES: Record<BoxKind, Record<Category, { min: number; max: number }>> = {
  snack: {
    sleeve: { min: 1, max: 1 },
    ribbon: { min: 1, max: 1 },
    snack: { min: 1, max: 6 },
    cake: { min: 0, max: 1 },
    confectionery: { min: 0, max: 3 },
    favor: { min: 0, max: 2 },
  },
  gift: {
    sleeve: { min: 1, max: 1 },
    ribbon: { min: 1, max: 1 },
    snack: { min: 0, max: 0 },
    cake: { min: 0, max: 0 },
    confectionery: { min: 0, max: 0 },
    favor: { min: 1, max: 3 },
  },
};

/** A box with no edibles is a return-gift box. */
export function boxKindOf(items: Record<string, number>): BoxKind {
  const edible = Object.keys(items).some((id) => {
    const c = CATALOG_BY_ID.get(id)?.category;
    return c !== undefined && EDIBLE_CATEGORIES.includes(c);
  });
  return edible || Object.keys(items).length === 0 ? "snack" : "gift";
}

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
