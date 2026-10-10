import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Checkout } from "@/components/booking/Checkout";
import { PageShell } from "@/components/layout/PageShell";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  // Optimistic UI hint only; /api/bookings re-checks the DB session.
  const signedIn = Boolean(await verifySession((await cookies()).get(SESSION_COOKIE)?.value));
  return (
    <PageShell eyebrow="Checkout" title="Almost party time.">
      <Checkout signedIn={signedIn} />
    </PageShell>
  );
}
