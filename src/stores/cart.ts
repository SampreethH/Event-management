"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartLine } from "@/lib/booking/schema";
import type { DecorKit } from "@/lib/domain/catalog";

interface CartState {
  lines: CartLine[];
  decor: DecorKit["id"][];
  express: boolean;
  add: (line: CartLine) => void;
  remove: (index: number) => void;
  setQuantity: (index: number, quantity: number) => void;
  toggleDecor: (id: DecorKit["id"]) => void;
  setExpress: (express: boolean) => void;
  replace: (lines: CartLine[], decor?: DecorKit["id"][], express?: boolean) => void;
  clear: () => void;
}

/** Guests can build a full cart without signing in; it survives the OTP redirect via localStorage. */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      decor: [],
      express: false,
      add: (line) => set((s) => ({ lines: [...s.lines, line].slice(-10), express: false })),
      remove: (index) => set((s) => ({ lines: s.lines.filter((_, i) => i !== index) })),
      setQuantity: (index, quantity) =>
        set((s) => ({ lines: s.lines.map((l, i) => (i === index ? { ...l, quantity: Math.max(1, Math.min(1000, quantity)) } : l)) })),
      toggleDecor: (id) => set((s) => ({ decor: s.decor.includes(id) ? s.decor.filter((d) => d !== id) : [...s.decor, id] })),
      setExpress: (express) => set({ express }),
      replace: (lines, decor = [], express = false) => set({ lines, decor, express }),
      clear: () => set({ lines: [], decor: [], express: false }),
    }),
    { name: "festoon-cart", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
