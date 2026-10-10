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
    pitch: "Ten snack boxes: chips, samosa, jam bun, cake and a return gift. The forgot-it-was-today kit.",
    boxes: 10,
    spec: {
      sleeveId: "sleeve-red",
      ribbonId: "ribbon-gold-satin",
      ribbonText: "",
      items: { "snack-salted-chips": 1, "snack-samosa": 1, "snack-jam-bun": 1, "cake-plain-vanilla": 1, "conf-eclairs": 1, "favor-glow-sticks": 1 },
    },
  },
  {
    id: "rescue-25",
    name: "Rescue 25",
    pitch: "A whole class or office floor, sorted inside 90 minutes.",
    boxes: 25,
    spec: {
      sleeveId: "sleeve-blue",
      ribbonId: "ribbon-gold-satin",
      ribbonText: "",
      items: { "snack-peri-peri-chips": 1, "snack-veg-puff": 1, "snack-cream-bun-vanilla": 1, "cake-plain-chocolate": 1, "conf-chocolate-bar": 1, "favor-colouring-kit": 1 },
    },
  },
  {
    id: "midnight-drop",
    name: "Midnight Cake Drop",
    pitch: "Six cake slices, Mysore pak and kaju katli. For the 11:58 pm surprise.",
    boxes: 6,
    spec: {
      sleeveId: "sleeve-black",
      ribbonId: "ribbon-gold-satin",
      ribbonText: "",
      items: { "snack-banana-chips": 1, "cake-honey": 1, "conf-mysore-pak": 1, "conf-kaju-katli": 1 },
    },
  },
];

export const SOS_WINDOW_MINUTES = { min: 60, max: 90 } as const;
