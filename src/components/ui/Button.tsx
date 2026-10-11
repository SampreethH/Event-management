"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { magnetic } from "@/lib/client/pointer-fx";

type Variant = "gold" | "coral" | "glass" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // Espresso with a gilded edge and a sheen on hover — the house CTA.
  gold: "btn-luxe hover:-translate-y-px",
  coral: "bg-celebration-coral text-white hover:brightness-110 shadow-glow-coral",
  glass: "glass text-mist hover:border-champagne/40 hover:bg-ivory",
  ghost: "text-mist-muted hover:text-mist hover:bg-ink/5",
};
const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-7 text-base",
};

export function buttonClass(variant: Variant = "gold", size: Size = "md", className?: string) {
  return cn(
    "relative inline-flex select-none items-center justify-center gap-2 rounded-full font-sub font-semibold tracking-tight transition-all duration-200",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

/** House CTAs lean toward the cursor; quieter variants stay put. */
const MAGNETIC: Record<Variant, number> = { gold: 0.28, coral: 0.2, glass: 0, ghost: 0 };

export function Button({ variant = "gold", size, className, ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...magnetic(MAGNETIC[variant])} {...rest} />;
}

export function ButtonLink({ variant = "gold", size, className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...magnetic(MAGNETIC[variant])} {...rest} />;
}

/** A plain Link with the magnetic pull, for hand-styled CTAs. */
export function MagneticLink({ strength = 0.28, ...rest }: ComponentProps<typeof Link> & { strength?: number }) {
  return <Link {...magnetic(strength)} {...rest} />;
}
