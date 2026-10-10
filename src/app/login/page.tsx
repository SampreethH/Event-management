import type { Metadata } from "next";
import { OtpLogin } from "@/components/auth/OtpLogin";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const { next, reason } = await searchParams;
  return (
    <div className="grid min-h-[85svh] place-items-center px-4 pt-28">
      <OtpLogin next={next} reason={reason} />
    </div>
  );
}
