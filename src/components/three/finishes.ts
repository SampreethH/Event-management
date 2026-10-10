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
  /** rgb triplet for the page glow behind the box, e.g. "201,162,87" (kept soft: it washes an ivory page). */
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
    sleeveId: "sleeve-black",
    name: "Black & gold",
    label: "MIDNIGHT FOIL",
    swatch: "radial-gradient(circle at 30% 30%, #2a2a3d, #0b0b13 60%), #0b0b13",
    glow: "201,162,87",
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
    sleeveId: "sleeve-red",
    name: "Red",
    label: "CELEBRATION RED",
    swatch: "radial-gradient(circle at 30% 30%, #e25c5c, #c62828 60%), #c62828",
    glow: "222,150,138",
    board: "#C62828",
    sheen: "#F2A3A3",
    foil: "#F9E29A",
    emissive: "#B88A2A",
    emissiveIntensity: 0.32,
    satin: "#F9E29A",
    velvet: "#4A1517",
    velvetSheen: "#FF8A80",
    tissue: "#F3D9A0",
  },
  lavender: {
    sleeveId: "sleeve-pink",
    name: "Pink",
    label: "RANI PINK",
    swatch: "radial-gradient(circle at 30% 30%, #f48fb8, #e3418a 60%), #e3418a",
    glow: "226,150,180",
    board: "#E3418A",
    sheen: "#FFD0E4",
    foil: "#F9E29A",
    emissive: "#B88A2A",
    emissiveIntensity: 0.3,
    satin: "#F9E29A",
    velvet: "#5A1634",
    velvetSheen: "#F48FB1",
    tissue: "#F7D6E4",
  },
  champagne: {
    sleeveId: "sleeve-gold",
    name: "Gold",
    label: "GOLD EDITION",
    swatch: "radial-gradient(circle at 30% 30%, #f9e29a, #e9c25a 60%), #e9c25a",
    glow: "214,184,118",
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
