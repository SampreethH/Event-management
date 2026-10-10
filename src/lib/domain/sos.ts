import type { BoxSpec } from "./box";

/** Pre-packed express kits. Every item here is flagged `express` in the catalog. */
export interface SosKit {
  id: string;
  name: string;
  pitch: string;
  boxes: number;
  spec: BoxSpec;
}

export const SOS_KITS: readonly SosKit[] = [
  {
    id: "rescue-10",
    name: "Rescue 10",
    pitch: "Ten snack boxes, cake tier and favors. The forgot-it-was-today kit.",
    boxes: 10,
    spec: {
      sleeveId: "sleeve-coral-pop",
      ribbonId: "ribbon-gold-satin",
      ribbonText: "",
      items: { "snack-caramel-popcorn": 1, "snack-nachos-salsa": 1, "cake-red-velvet": 1, "conf-chocolate-coins": 1, "favor-glow-sticks": 1 },
    },
  },
  {
    id: "rescue-25",
    name: "Rescue 25",
    pitch: "A whole class or office floor, sorted inside 90 minutes.",
    boxes: 25,
    spec: {
      sleeveId: "sleeve-midnight-foil",
      ribbonId: "ribbon-gold-satin",
      ribbonText: "",
      items: { "snack-masala-makhana": 1, "snack-nachos-salsa": 1, "cake-belgian-chocolate": 1, "conf-vegan-gummies": 1, "favor-bubble-wand": 1 },
    },
  },
  {
    id: "midnight-drop",
    name: "Midnight Cake Drop",
    pitch: "Six tiers, sparklers-ready, gold coins. For the 11:58 pm surprise.",
    boxes: 6,
    spec: {
      sleeveId: "sleeve-champagne-pleat",
      ribbonId: "ribbon-gold-satin",
      ribbonText: "",
      items: { "snack-trail-mix": 1, "cake-belgian-chocolate": 1, "conf-kaju-katli": 1 },
    },
  },
];

export const SOS_WINDOW_MINUTES = { min: 60, max: 90 } as const;
