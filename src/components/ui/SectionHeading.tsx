import type { ReactNode } from "react";

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="max-w-2xl">
      <p className="mb-3 font-sub text-xs font-semibold uppercase tracking-[0.28em] text-champagne/80">{eyebrow}</p>
      <h2 className="font-display text-4xl leading-[1.02] font-bold tracking-tight text-balance text-mist sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-base leading-relaxed text-pretty text-mist-muted sm:text-lg">{children}</p>}
    </header>
  );
}
