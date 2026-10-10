"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { TRANSITIONS, type AnyStatus } from "@/lib/domain/order-status";
import { withUser } from "@/lib/server/db";

const STATUSES = ["PENDING_PAYMENT", "NEW", "PACKING", "DISPATCHED", "DELIVERED", "EVENT_COMPLETED", "CANCELLED"] as const;

const moveSchema = z.object({ orderId: z.string().cuid(), to: z.enum(STATUSES), note: z.string().max(200).optional() });

/** Advances an order along the pipeline. Only legal transitions; cancelling and manual payment confirmation are admin-only. */
export async function moveOrder(formData: FormData) {
  const user = await requireUser({ staff: true });
  const { orderId, to, note } = moveSchema.parse(Object.fromEntries(formData));

  await withUser(user, async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } });
    // Staff run the floor; cancelling or confirming an unpaid order needs an admin.
    if (user.role !== "ADMIN" && (to === "CANCELLED" || order.status === "PENDING_PAYMENT")) throw new Error("Admin only");
    if (!TRANSITIONS[order.status as AnyStatus].includes(to)) throw new Error(`Can't move ${order.status} → ${to}`);
    // Conditional update guards against two staff moving the same card at once.
    const res = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: to } });
    if (res.count !== 1) throw new Error("Order changed — refresh");
    await tx.orderEvent.create({ data: { orderId, from: order.status, to, actorId: user.id, note } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "order.move", target: orderId, meta: { from: order.status, to } } });
  });
  revalidatePath("/admin");
}

const stockSchema = z.object({
  inventoryId: z.string().cuid(),
  delta: z.coerce.number().int().min(-10_000).max(10_000).refine((n) => n !== 0),
  reason: z.enum(["restock", "damage", "manual", "count-correction"]),
});

export async function adjustStock(formData: FormData) {
  const user = await requireUser({ staff: true });
  const { inventoryId, delta, reason } = stockSchema.parse(Object.fromEntries(formData));
  await withUser(user, async (tx) => {
    const item = await tx.inventoryItem.update({ where: { id: inventoryId }, data: { onHand: { increment: delta } } });
    if (item.onHand < 0) throw new Error("Stock can't go below zero");
    await tx.inventoryMovement.create({ data: { inventoryId, delta, reason, actorId: user.id } });
  });
  revalidatePath("/admin");
}

const assignSchema = z.object({
  bookingId: z.string().cuid(),
  decoratorId: z.string().cuid().or(z.literal("")),
  routeOrder: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(1).max(20).optional()),
});

export async function assignDecorator(formData: FormData) {
  const user = await requireUser({ roles: ["ADMIN", "STAFF"] });
  const { bookingId, decoratorId, routeOrder } = assignSchema.parse(Object.fromEntries(formData));
  await withUser(user, async (tx) => {
    if (decoratorId) {
      const d = await tx.user.findUnique({ where: { id: decoratorId }, select: { role: true } });
      if (d?.role !== "DECORATOR") throw new Error("Not a decorator");
    }
    await tx.decorBooking.update({
      where: { id: bookingId },
      data: decoratorId ? { decoratorId, routeOrder, status: "ASSIGNED" } : { decoratorId: null, routeOrder: null, status: "CONFIRMED" },
    });
  });
  revalidatePath("/admin");
}
