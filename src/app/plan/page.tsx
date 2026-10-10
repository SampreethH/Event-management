import type { Metadata } from "next";
import { PartyCalculator } from "@/components/features/PartyCalculator";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = { title: "Party calculator", description: "Exact box, snack, cake and decor quantities for your guest list." };

export default function PlanPage() {
  return (
    <PageShell eyebrow="Smart party calculator" title="Right-sized, not over-ordered." intro="Teens eat nearly twice what kids do. Long parties need more, but not linearly. We do the maths.">
      <PartyCalculator />
    </PageShell>
  );
}
