import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function PageShell({ eyebrow, title, intro, children }: { eyebrow: string; title: ReactNode; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-32 sm:px-6">
      <SectionHeading eyebrow={eyebrow} title={title}>
        {intro}
      </SectionHeading>
      <div className="mt-10">{children}</div>
    </div>
  );
}
