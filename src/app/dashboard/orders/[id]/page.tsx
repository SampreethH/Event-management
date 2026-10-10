import { notFound, redirect } from "next/navigation";
import { InvoiceLink, PayBalanceButton, ReorderButton } from "@/components/dashboard/OrderActions";
import { StatusTrack } from "@/components/dashboard/StatusTrack";
import { Glass } from "@/components/ui/Glass";
import { getCurrentUser } from "@/lib/auth/session";
import { formatPaise } from "@/lib/domain/money";
import { STATUS_LABEL } from "@/lib/domain/order-status";
import { withUser } from "@/lib/server/db";
import { reorderLines } from "@/lib/server/orders";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) redirect(`/login?next=/dashboard/orders/${id}`);
  const { paid } = await searchParams;

  const order = await withUser(user, (tx) =>
    tx.order.findUnique({
      where: { id },
      include: { lines: true, events: { orderBy: { createdAt: "asc" } }, payments: { orderBy: { createdAt: "asc" } }, decorBookings: { include: { kit: true } } },
    }),
  );
  if (!order) notFound();
  const outstanding = order.totalPaise - order.paidPaise;

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 pt-32 sm:px-6">
      {paid && <p className="rounded-2xl border border-mint-300/30 bg-mint-300/10 p-4 text-sm text-mint-300">Payment received — it can take a minute to reflect here.</p>}
      <Glass strong className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-champagne/80">{order.channel === "SOS_EXPRESS" ? "SOS express" : "Scheduled"}</p>
            <h1 className="mt-1 font-mono text-3xl font-bold tracking-wide sm:text-4xl">{order.reference}</h1>
            <p className="mt-1 text-mist-muted">
              {order.slotStart.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} –{" "}
              {order.slotEnd.toLocaleTimeString("en-IN", { timeStyle: "short", timeZone: "Asia/Kolkata" })}
            </p>
          </div>
          <StatusTrack status={order.status} />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {outstanding > 0 && order.status !== "CANCELLED" && <PayBalanceButton orderId={order.id} amount={outstanding} />}
          <InvoiceLink orderId={order.id} />
          <ReorderButton lines={reorderLines(order.lines)} />
        </div>
      </Glass>

      <Glass className="p-6">
        <h2 className="font-display text-xl font-semibold">What&apos;s coming</h2>
        <ul className="mt-4 divide-y divide-white/10 text-sm">
          {order.lines.map((l) => (
            <li key={l.id} className="flex justify-between py-2.5">
              <span>
                {l.label} <span className="text-mist-faint">× {l.quantity}</span>
              </span>
              <span className="tabular-nums">{formatPaise(l.linePaise)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 text-sm text-mist-muted">
          <div className="flex justify-between"><dt>Total</dt><dd className="font-semibold text-mist tabular-nums">{formatPaise(order.totalPaise)}</dd></div>
          <div className="flex justify-between"><dt>Paid</dt><dd className="tabular-nums">{formatPaise(order.paidPaise)}</dd></div>
          <div className="flex justify-between"><dt>Balance</dt><dd className="tabular-nums text-champagne">{formatPaise(Math.max(0, outstanding))}</dd></div>
        </dl>
      </Glass>

      <Glass className="p-6">
        <h2 className="font-display text-xl font-semibold">Timeline</h2>
        <ol className="mt-4 space-y-3 border-l border-white/10 pl-5 text-sm">
          {order.events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-champagne" />
              <p className="font-semibold">{STATUS_LABEL[e.to]}</p>
              <p className="text-xs text-mist-faint">{e.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
            </li>
          ))}
        </ol>
      </Glass>
    </div>
  );
}
