import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InvoiceLink, ReorderButton, SignOutButton } from "@/components/dashboard/OrderActions";
import { StatusTrack } from "@/components/dashboard/StatusTrack";
import { ButtonLink } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { getCurrentUser } from "@/lib/auth/session";
import { CATALOG_BY_ID } from "@/lib/domain/catalog";
import { formatPaise } from "@/lib/domain/money";
import { withUser } from "@/lib/server/db";
import { reorderLines } from "@/lib/server/orders";

export const metadata: Metadata = { title: "My celebrations", robots: { index: false } };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const { orders, boxes } = await withUser(user, async (tx) => ({
    orders: await tx.order.findMany({
      where: { userId: user.id },
      orderBy: { slotStart: "desc" },
      take: 30,
      include: { lines: { select: { kind: true, label: true, spec: true, quantity: true } }, splitLink: { select: { raisedPaise: true, targetPaise: true } } },
    }),
    boxes: await tx.customBox.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 6, include: { items: true } }),
  }));

  const upcoming = orders.filter((o) => o.slotStart > new Date() && o.status !== "CANCELLED");
  const past = orders.filter((o) => !upcoming.includes(o));

  return (
    <div className="mx-auto max-w-6xl px-4 pt-32 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-champagne/80">My celebrations</p>
          <h1 className="mt-2 font-display text-5xl font-bold">{upcoming.length ? `${upcoming.length} coming up` : "Nothing planned yet"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/security" className="rounded-full px-4 py-2 text-sm text-mist-muted hover:bg-white/5 hover:text-mist">
            Security {user.factors.includes("totp") ? "· 2FA on" : ""}
          </Link>
          {user.role !== "CUSTOMER" && (
            <Link href="/admin" className="rounded-full px-4 py-2 text-sm text-lavender-300 hover:bg-white/5">
              Ops portal
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>

      <section className="mt-10 space-y-3">
        {orders.length === 0 && (
          <Glass className="p-10 text-center">
            <p className="text-mist-muted">Your first celebration is one box away.</p>
            <ButtonLink href="/build" className="mt-5">
              Build a box
            </ButtonLink>
          </Glass>
        )}
        {[...upcoming, ...past].map((o) => (
          <Glass key={o.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
            <Link href={`/dashboard/orders/${o.id}`} className="min-w-[180px] flex-1">
              <p className="font-mono text-base font-medium tracking-wide">{o.reference}</p>
              <p className="text-sm text-mist-muted">
                {o.slotStart.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })} · {o.guestCount} guests
                {o.channel === "SOS_EXPRESS" && <span className="ml-2 text-tangerine">⚡ SOS</span>}
              </p>
            </Link>
            <StatusTrack status={o.status} />
            <p className="w-28 text-right font-display font-semibold tabular-nums">{formatPaise(o.totalPaise)}</p>
            <div className="flex gap-1">
              <InvoiceLink orderId={o.id} />
              <ReorderButton lines={reorderLines(o.lines)} />
            </div>
          </Glass>
        ))}
      </section>

      {boxes.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold">Saved designs</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {boxes.map((b) => {
              const sleeve = CATALOG_BY_ID.get(b.sleeveId);
              return (
                <Glass key={b.id} className="p-5">
                  <span className="block h-16 rounded-xl" style={{ background: `linear-gradient(135deg, ${sleeve?.color}, ${sleeve?.accent})` }} />
                  <p className="mt-3 font-semibold">{b.name}</p>
                  <p className="text-xs text-mist-faint">{b.ribbonText ? `“${b.ribbonText}” · ` : ""}{b.items.length - 1} items</p>
                </Glass>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
