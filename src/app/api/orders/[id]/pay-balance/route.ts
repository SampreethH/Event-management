import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { startPayment } from "@/lib/booking/engine";
import { PROVIDERS } from "@/lib/booking/schema";
import { withUser } from "@/lib/server/db";
import { HttpError, handle, readJson } from "@/lib/server/http";
import { enforce } from "@/lib/server/rate-limit";

const schema = z.object({ provider: z.enum(PROVIDERS) });

/** Pays whatever is outstanding (deposit balance, or an unpaid order). */
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  await enforce(["booking", user.id]);
  const { provider } = await readJson(req, schema);
  const { id } = await params;
  const order = await withUser(user, (tx) =>
    tx.order.findUnique({ where: { id }, select: { id: true, reference: true, status: true, totalPaise: true, paidPaise: true } }),
  );
  if (!order) throw new HttpError(404, "Order not found");
  if (order.status === "CANCELLED") throw new HttpError(409, "Order was cancelled");
  const outstanding = order.totalPaise - order.paidPaise;
  if (outstanding <= 0) throw new HttpError(409, "Nothing left to pay");

  const payment = await startPayment({
    provider,
    orderId: order.id,
    reference: order.reference,
    amount: outstanding,
    purpose: order.paidPaise > 0 ? "balance" : "full",
    idempotencyKey: `${order.id}:${order.paidPaise}`,
    returnPath: `/dashboard/orders/${order.id}`,
  });
  return NextResponse.json({ payment });
});
