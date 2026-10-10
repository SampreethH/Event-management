import type { Metadata } from "next";
import { DecorVisualizer } from "@/components/features/DecorVisualizer";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = { title: "Decor visualizer", description: "Preview balloon arches, neon backdrops and boho tabletops in a true-to-scale room." };

export default function DecorPage() {
  return (
    <PageShell eyebrow="3D decor visualizer" title="See it in your living room first." intro="Stage kits in a standard room, flip to evening glow, and check the fit before your decorator arrives.">
      <DecorVisualizer />
    </PageShell>
  );
}
