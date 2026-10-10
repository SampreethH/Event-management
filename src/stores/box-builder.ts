"use client";

import { create } from "zustand";
import { BOX_RULES, CATALOG_BY_ID, RIBBON_TEXT_MAX } from "@/lib/domain/catalog";
import type { BoxSpec } from "@/lib/domain/box";

export const DEFAULT_SPEC: BoxSpec = {
  sleeveId: "sleeve-midnight-foil",
  ribbonId: "ribbon-gold-satin",
  ribbonText: "",
  items: { "snack-masala-makhana": 1, "snack-caramel-popcorn": 1, "cake-red-velvet": 1 },
};

interface BuilderState {
  spec: BoxSpec;
  quantity: number;
  /** Last rule violation, surfaced as a gentle toast in the UI. */
  notice: string | null;
  setSleeve: (id: string) => void;
  setRibbon: (id: string) => void;
  setRibbonText: (text: string) => void;
  toggleItem: (id: string) => void;
  setQuantity: (n: number) => void;
  load: (spec: BoxSpec, quantity?: number) => void;
  reset: () => void;
  clearNotice: () => void;
}

export const useBoxBuilder = create<BuilderState>()((set, get) => ({
  spec: DEFAULT_SPEC,
  quantity: 12,
  notice: null,
  setSleeve: (sleeveId) => set((s) => ({ spec: { ...s.spec, sleeveId } })),
  setRibbon: (ribbonId) => set((s) => ({ spec: { ...s.spec, ribbonId } })),
  setRibbonText: (text) => set((s) => ({ spec: { ...s.spec, ribbonText: text.slice(0, RIBBON_TEXT_MAX) } })),
  toggleItem: (id) => {
    const item = CATALOG_BY_ID.get(id);
    if (!item) return;
    const { spec } = get();
    const items = { ...spec.items };
    if (items[id]) {
      const inCategory = Object.keys(items).filter((k) => CATALOG_BY_ID.get(k)?.category === item.category).length;
      if (inCategory <= BOX_RULES[item.category].min) {
        set({ notice: `Every box needs at least ${BOX_RULES[item.category].min} ${item.category}.` });
        return;
      }
      delete items[id];
      set({ spec: { ...spec, items }, notice: null });
      return;
    }
    const sameCat = Object.keys(items).filter((k) => CATALOG_BY_ID.get(k)?.category === item.category);
    const { max } = BOX_RULES[item.category];
    if (sameCat.length >= max) {
      // Single-slot categories swap; multi-slot ones ask the user to make room.
      if (max === 1) delete items[sameCat[0]!];
      else {
        set({ notice: `Room for ${max} ${item.category} items — remove one first.` });
        return;
      }
    }
    items[id] = 1;
    set({ spec: { ...spec, items }, notice: null });
  },
  setQuantity: (n) => set({ quantity: Math.max(1, Math.min(1000, Math.round(n) || 1)) }),
  load: (spec, quantity) => set((s) => ({ spec, quantity: quantity ?? s.quantity, notice: null })),
  reset: () => set({ spec: DEFAULT_SPEC, quantity: 12, notice: null }),
  clearNotice: () => set({ notice: null }),
}));
