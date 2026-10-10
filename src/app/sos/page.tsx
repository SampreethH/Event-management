import type { Metadata } from "next";
import { SosExpress } from "@/components/features/SosExpress";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = { title: "SOS express party kits", description: "Last-minute party kits delivered in 60–90 minutes." };

export default function SosPage() {
  return (
    <PageShell eyebrow="SOS end-moment kits" title={<>Party in <span className="text-tangerine">90 minutes</span>.</>} intro="Pre-packed at hubs near you. Check your PIN code for live stock, then we dispatch on priority.">
      <SosExpress />
    </PageShell>
  );
}
