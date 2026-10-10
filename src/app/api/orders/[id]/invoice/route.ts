import { requireUser } from "@/lib/auth/session";
import { formatPaise } from "@/lib/domain/money";
import { withUser } from "@/lib/server/db";
import { HttpError, handle } from "@/lib/server/http";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Printable tax invoice. RLS guarantees a customer can only fetch their own orders. */
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const order = await withUser(user, (tx) => tx.order.findUnique({ where: { id }, include: { lines: true } }));
  if (!order) throw new HttpError(404, "Order not found");

  const rows = order.lines
    .map((l) => `<tr><td>${esc(l.label)}</td><td>${l.quantity}</td><td>${formatPaise(l.unitPricePaise)}</td><td>${formatPaise(l.linePaise)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(order.reference)}</title>
<style>body{font:14px/1.5 system-ui;margin:48px;color:#111}table{width:100%;border-collapse:collapse;margin:24px 0}
td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}td:nth-child(n+2),th:nth-child(n+2){text-align:right}
.t{display:flex;justify-content:space-between;max-width:320px;margin-left:auto}</style></head><body>
<h1>Festoon — Tax invoice</h1><p>Order <b>${esc(order.reference)}</b> · ${order.createdAt.toISOString().slice(0, 10)}</p>
<table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="t"><span>Subtotal</span><span>${formatPaise(order.subtotalPaise)}</span></div>
<div class="t"><span>Bulk discount</span><span>−${formatPaise(order.discountPaise)}</span></div>
<div class="t"><span>GST</span><span>${formatPaise(order.taxPaise)}</span></div>
<div class="t"><b>Total</b><b>${formatPaise(order.totalPaise)}</b></div>
<div class="t"><span>Paid</span><span>${formatPaise(order.paidPaise)}</span></div>
<div class="t"><span>Balance due</span><span>${formatPaise(Math.max(0, order.totalPaise - order.paidPaise))}</span></div>
</body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoice-${order.reference}.html"`,
      "Cache-Control": "private, no-store",
    },
  });
});
