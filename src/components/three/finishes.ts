/**
 * 3D looks for the landing box, one per catalog sleeve (see `lib/domain/catalog.ts`), so the
 * swatch a visitor picks on the homepage is a sleeve they can actually order in the builder.
 * Plain data (no three.js import) so the landing page can render the picker without pulling
 * the WebGL bundle in eagerly.
 */
export type SleeveFinish = "midnight" | "coral" | "lavender" | "champagne";

export interface FinishSpec {
  /** Catalog sleeve id this look mirrors. */
  sleeveId: string;
  /** Name shown on the swatch (matches the catalog). */
  name: string;
  /** Sub-line hot-foiled under the wordmark. */
  label: string;
  /** CSS swatch fill. */
  swatch: string;
  /** rgb triplet for the page glow behind the box, e.g. "124,92,230". */
  glow: string;
  board: string;
  sheen: string;
  foil: string;
  emissive: string;
  emissiveIntensity: number;
  satin: string;
  velvet: string;
  velvetSheen: string;
  tissue: string;
}

export const FINISHES: Record<SleeveFinish, FinishSpec> = {
  midnight: {
    sleeveId: "sleeve-midnight-foil",
    name: "Midnight Foil",
    label: "MIDNIGHT FOIL",
    swatch: "radial-gradient(circle at 30% 30%, #2a2a3d, #0b0b13 60%), #0b0b13",
    glow: "124,92,230",
    board: "#0B0B13",
    sheen: "#4B3C8F",
    foil: "#E7BE5C",
    emissive: "#B88A2A",
    emissiveIntensity: 0.55,
    satin: "#D9B25A",
    velvet: "#24123A",
    velvetSheen: "#9A6BE0",
    tissue: "#C9A257",
  },
  coral: {
    sleeveId: "sleeve-coral-pop",
    name: "Coral Pop",
    label: "CORAL POP",
    swatch: "radial-gradient(circle at 30% 30%, #ff8f8c, #ff5e5b 60%), #ff5e5b",
    glow: "255,94,91",
    board: "#E8504C",
    sheen: "#FFB3A8",
    foil: "#F9E29A",
    emissive: "#B88A2A",
    emissiveIntensity: 0.32,
    satin: "#F9E29A",
    velvet: "#4A1517",
    velvetSheen: "#FF8A80",
    tissue: "#F3D9A0",
  },
  lavender: {
    sleeveId: "sleeve-lavender-haze",
    name: "Lavender Haze",
    label: "LAVENDER HAZE",
    swatch: "radial-gradient(circle at 30% 30%, #e9ddff, #a78bfa 60%), #a78bfa",
    glow: "167,139,250",
    board: "#8F74E6",
    sheen: "#E9DDFF",
    foil: "#F4F1FA",
    emissive: "#8E7CC3",
    emissiveIntensity: 0.28,
    satin: "#E6DCFF",
    velvet: "#2E2058",
    velvetSheen: "#C9B8FD",
    tissue: "#DCD3F2",
  },
  champagne: {
    sleeveId: "sleeve-champagne-pleat",
    name: "Champagne Pleat",
    label: "CHAMPAGNE PLEAT",
    swatch: "radial-gradient(circle at 30% 30%, #f9e29a, #e9c25a 60%), #e9c25a",
    glow: "245,208,97",
    board: "#E8CD82",
    sheen: "#FFF8E6",
    foil: "#17130C",
    emissive: "#000000",
    emissiveIntensity: 0,
    satin: "#1B1710",
    velvet: "#2A2114",
    velvetSheen: "#E9C25A",
    tissue: "#F2E3B8",
  },
};

export const FINISH_ORDER: SleeveFinish[] = ["midnight", "coral", "lavender", "champagne"];
