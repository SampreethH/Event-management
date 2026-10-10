"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Full-screen pages that bring their own navigation. */
const IMMERSIVE = ["/experience"];

/** Hides site-wide chrome (ticker, navbar, footer, concierge dock) on immersive routes. */
export function ChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return IMMERSIVE.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? null : children;
}
