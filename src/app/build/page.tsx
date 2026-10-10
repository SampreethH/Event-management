import type { Metadata } from "next";
import { BoxBuilder } from "@/components/builder/BoxBuilder";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Build your box",
  description: "Pick the sleeve, print your message, choose snacks, cake and favors. Live dietary checks and pricing as you go.",
};

export default function BuildPage() {
  return (
    <PageShell
      eyebrow="Build your box in 3D"
      title="Design the box they'll remember."
      intro="Choose a sleeve and ribbon, add your message, then fill it. Dietary badges and pricing update as you build."
    >
      <BoxBuilder />
    </PageShell>
  );
}
