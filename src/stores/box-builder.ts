"use client";

import { create } from "zustand";
import { BOX_RULES, CATALOG_BY_ID, RIBBON_TEXT_MAX, boxKindOf, type BoxKind } from "@/lib/domain/catalog";
import type { BoxSpec } from "@/lib/domain/box";

export const DEFAULT_SPEC: BoxSpec = {
  sleeveId: "sleeve-red",
  ribbonId: "ribbon-gold-satin",
  ribbonText: "",
  items: { "snack-salted-chips": 1, "snack-samosa": 1, "cake-plain-vanilla": 1, "conf-chocolate-bar": 1 },
};

export const DEFAULT_GIFT_ITEMS: BoxSpec["items"] = { "favor-stationery-kit": 1 };

const label = (category: string) => (category === "favor" ? "return gift" : category);

interface BuilderState {
  spec: BoxSpec;
  /** Snack box or return-gift box; mirrors boxKindOf(spec.items) once items are chosen. */
  kind: BoxKind;
  quantity: number;
  /** Last rule violation, surfaced as a gentle toast in the UI. */
  notice: string | null;
  setKind: (kind: BoxKind) => void;
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
  kind: "snack",
  quantity: 12,
  notice: null,
  setKind: (kind) => {
    const { spec, kind: current } = get();
    if (kind === current) return;
    // Keep the sleeve, ribbon and message; swap the contents to suit the new kind.
    const keptFavors = Object.fromEntries(Object.entries(spec.items).filter(([id]) => CATALOG_BY_ID.get(id)?.category === "favor"));
    const items =
      kind === "gift"
        ? Object.keys(keptFavors).length
          ? keptFavors
          : DEFAULT_GIFT_ITEMS
        : { ...DEFAULT_SPEC.items, ...Object.fromEntries(Object.entries(keptFavors).slice(0, BOX_RULES.snack.favor.max)) };
    set({ kind, spec: { ...spec, items }, notice: null });
  },
  setSleeve: (sleeveId) => set((s) => ({ spec: { ...s.spec, sleeveId } })),
  setRibbon: (ribbonId) => set((s) => ({ spec: { ...s.spec, ribbonId } })),
  setRibbonText: (text) => set((s) => ({ spec: { ...s.spec, ribbonText: text.slice(0, RIBBON_TEXT_MAX) } })),
  toggleItem: (id) => {
    const item = CATALOG_BY_ID.get(id);
    if (!item) return;
    const { spec, kind } = get();
    const rules = BOX_RULES[kind];
    const items = { ...spec.items };
    if (items[id]) {
      const inCategory = Object.keys(items).filter((k) => CATALOG_BY_ID.get(k)?.category === item.category).length;
      if (inCategory <= rules[item.category].min) {
        set({ notice: `Every box needs at least ${rules[item.category].min} ${label(item.category)}.` });
        return;
      }
      delete items[id];
      set({ spec: { ...spec, items }, notice: null });
      return;
    }
    const sameCat = Object.keys(items).filter((k) => CATALOG_BY_ID.get(k)?.category === item.category);
    const { max } = rules[item.category];
    if (max === 0) return;
    if (sameCat.length >= max) {
      // Single-slot categories swap; multi-slot ones ask the user to make room.
      if (max === 1) delete items[sameCat[0]!];
      else {
        set({ notice: `Room for ${max} ${label(item.category)} items — remove one first.` });
        return;
      }
    }
    items[id] = 1;
    set({ spec: { ...spec, items }, notice: null });
  },
  setQuantity: (n) => set({ quantity: Math.max(1, Math.min(1000, Math.round(n) || 1)) }),
  load: (spec, quantity) => set((s) => ({ spec, kind: boxKindOf(spec.items), quantity: quantity ?? s.quantity, notice: null })),
  reset: () => set({ spec: DEFAULT_SPEC, kind: "snack", quantity: 12, notice: null }),
  clearNotice: () => set({ notice: null }),
}));
