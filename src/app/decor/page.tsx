import type { Metadata } from "next";
import { DecorScrub } from "@/components/features/DecorScrub";
import { DecorVisualizer } from "@/components/features/DecorVisualizer";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = { title: "Decor visualizer", description: "Preview balloon arches, neon backdrops and boho tabletops in a true-to-scale room." };

export default function DecorPage() {
  return (
    <PageShell eyebrow="Decor by Festoon" title="From bare wall to party-ready." intro="Scroll to watch a room come together, then stage our kits in a true-to-scale room before your decorator arrives.">
      <DecorScrub />
      <div className="mt-24">
        <SectionHeading eyebrow="3D decor visualizer" title="See it in your living room first.">
          Stage kits in a standard room, flip to evening glow, and check the fit before your decorator arrives.
        </SectionHeading>
        <div className="mt-10">
          <DecorVisualizer />
        </div>
      </div>
    </PageShell>
  );
}
