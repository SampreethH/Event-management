import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SplitPayContribute } from "@/components/booking/SplitPayContribute";
import { getSplitLink } from "@/lib/booking/split";

export const metadata: Metadata = { title: "Chip in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SplitPayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await getSplitLink(token);
  if (!link) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-32 sm:px-6">
      <SplitPayContribute token={token} link={link} />
    </div>
  );
}
