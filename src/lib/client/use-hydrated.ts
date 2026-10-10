"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during SSR and the hydration pass, true afterwards — for localStorage-backed UI. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
