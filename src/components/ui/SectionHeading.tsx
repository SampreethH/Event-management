import type { ReactNode } from "react";

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="max-w-2xl">
      <p className="mb-4 flex items-center gap-3 font-sub text-xs font-semibold uppercase tracking-[0.28em] text-champagne">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-champagne" aria-hidden />
        {eyebrow}
      </p>
      <h2 className="font-display text-4xl leading-[1.02] font-semibold tracking-tight text-balance text-mist sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-base leading-relaxed text-pretty text-mist-muted sm:text-lg">{children}</p>}
    </header>
  );
}
