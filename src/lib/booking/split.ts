import "server-only";
import { z } from "zod";
import { sha256 } from "@/lib/server/crypto";
import { withSystem } from "@/lib/server/db";
import { startPayment } from "./engine";
import { PROVIDERS } from "./schema";
import { BookingError } from "./engine";
import type { ClientPayment } from "./gateways/types";

export const MIN_CONTRIBUTION = 10_000; // ₹100

export const contributeSchema = z.object({
  displayName: z.string().trim().min(1).max(60).transform((s) => s.replace(/[\u0000-\u001F<>]/g, "")),
  note: z.string().trim().max(140).optional().default(""),
  amount: z.number().int().min(MIN_CONTRIBUTION),
  provider: z.enum(PROVIDERS),
});

export interface PublicSplitLink {
  reference: string;
  theme: string | null;
  eventDate: string;
  guestCount: number;
  target: number;
  raised: number;
  suggestedShare: number;
  message: string | null;
  open: boolean;
  expiresAt: string;
  contributors: { name: string; amount: number; note: string | null }[];
}

/** Resolves a share token to what a guest is allowed to see — no address, no host contact. */
export async function getSplitLink(token: string): Promise<PublicSplitLink | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const link = await withSystem((tx) =>
    tx.splitPayLink.findUnique({
      where: { tokenHash: sha256(token) },
      include: {
        order: { select: { reference: true, theme: true, eventDate: true, guestCount: true, status: true } },
        contributions: { where: { paid: true }, orderBy: { createdAt: "asc" }, select: { displayName: true, amountPaise: true, note: true } },
      },
    }),
  );
  if (!link) return null;
  const open = !link.closedAt && link.expiresAt > new Date() && link.order.status !== "CANCELLED";
  return {
    reference: link.order.reference,
    theme: link.order.theme,
    eventDate: link.order.eventDate.toISOString(),
    guestCount: link.order.guestCount,
    target: link.targetPaise,
    raised: link.raisedPaise,
    suggestedShare: Math.ceil(link.targetPaise / link.suggestedShares / 100) * 100,
    message: link.message,
    open,
    expiresAt: link.expiresAt.toISOString(),
    contributors: link.contributions.map((c) => ({ name: c.displayName, amount: c.amountPaise, note: c.note })),
  };
}

export async function contribute(token: string, input: z.infer<typeof contributeSchema>, userId?: string): Promise<ClientPayment> {
  const created = await withSystem(async (tx) => {
    const link = await tx.splitPayLink.findUnique({ where: { tokenHash: sha256(token) }, include: { order: { select: { id: true, reference: true } } } });
    if (!link || link.closedAt || link.expiresAt < new Date()) throw new BookingError("This group gift is closed", "conflict");
    const remaining = link.targetPaise - link.raisedPaise;
    // Allow the final contributor to cover a remainder smaller than the minimum.
    if (input.amount > remaining || (input.amount < MIN_CONTRIBUTION && input.amount !== remaining)) {
      throw new BookingError(`Choose an amount up to ${Math.floor(remaining / 100)} rupees`, "conflict");
    }
    const c = await tx.splitContribution.create({
      data: { linkId: link.id, userId, displayName: input.displayName, note: input.note || null, amountPaise: input.amount },
    });
    return { contribution: c, order: link.order };
  });

  return startPayment({
    provider: input.provider,
    orderId: created.order.id,
    reference: created.order.reference,
    amount: input.amount,
    purpose: "split",
    idempotencyKey: created.contribution.id,
    contributionId: created.contribution.id,
    returnPath: `/pay/${token}`,
    prefill: { name: input.displayName },
  });
}
