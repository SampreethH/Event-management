import "server-only";
import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import { CATALOG_BY_ID } from "@/lib/domain/catalog";
import { CURRENCY } from "@/lib/domain/money";
import { encrypt, encryptJson, orderReference, randomToken, sha256 } from "@/lib/server/crypto";
import { withSystem, withUser } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { enforce } from "@/lib/server/rate-limit";
import { checkSos, reserveSosStock, type SosAvailability } from "@/lib/server/sos";
import { razorpay } from "./gateways/razorpay";
import { stripe } from "./gateways/stripe";
import type { ClientPayment, PaymentGateway, PaymentPurpose, ProviderName } from "./gateways/types";
import { quoteOrder, type OrderQuote } from "./quote";
import type { BookingRequest } from "./schema";
import { encodeConciergeLink, telUrl } from "./whatsapp";

const GATEWAYS: Record<ProviderName, PaymentGateway> = { RAZORPAY: razorpay, STRIPE: stripe };
const MIN_LEAD_HOURS = 20;
const MAX_ADVANCE_DAYS = 180;
const SPLIT_LINK_DAYS = 5;
const IST_OFFSET = "+05:30";

export class BookingError extends Error {
  constructor(
    message: string,
    public readonly code: "slot" | "sos" | "conflict" | "payment" = "slot",
    public readonly detail?: unknown,
  ) {
    super(message);
  }
}

export interface BookingResult {
  orderId: string;
  reference: string;
  quote: OrderQuote;
  payment?: ClientPayment;
  split?: { url: string; expiresAt: string };
  whatsappUrl: string;
  callUrl: string;
  sos?: SosAvailability;
}

function resolveSlot(req: BookingRequest, now: Date): { start: Date; end: Date } {
  if (req.express) {
    return { start: new Date(now.getTime() + 60 * 60_000), end: new Date(now.getTime() + 90 * 60_000) };
  }
  if (req.event.slot === "express") throw new BookingError("Express slot requires an SOS order");
  const [from, to] = req.event.slot.split("-");
  const start = new Date(`${req.event.date}T${from}:00${IST_OFFSET}`);
  const end = new Date(`${req.event.date}T${to}:00${IST_OFFSET}`);
  if (start.getTime() - now.getTime() < MIN_LEAD_HOURS * 3_600_000) {
    throw new BookingError(`Scheduled orders need ${MIN_LEAD_HOURS}h notice — try SOS express for sooner.`);
  }
  if (start.getTime() - now.getTime() > MAX_ADVANCE_DAYS * 86_400_000) throw new BookingError("That date is too far out to book online");
  return { start, end };
}

function dueNow(req: BookingRequest, quote: OrderQuote): { amount: number; purpose: PaymentPurpose } {
  if (req.paymentPlan === "DEPOSIT") return { amount: quote.deposit, purpose: "deposit" };
  if (req.paymentPlan === "SPLIT") return { amount: 0, purpose: "split" };
  return { amount: quote.total, purpose: "full" };
}

/**
 * The single entry point for creating an order from any channel.
 * Never trusts client totals: everything is re-priced from the catalog here.
 */
export async function createBooking(user: CurrentUser, req: BookingRequest): Promise<BookingResult> {
  await enforce(["booking", user.id]);
  const e = env();
  const now = new Date();
  const quote = quoteOrder(req);
  const slot = resolveSlot(req, now);
  const waPhone = e.NEXT_PUBLIC_CONCIERGE_WHATSAPP;

  // Idempotent replay: same key from the same user returns the original order.
  const existing = await withUser(user, (tx) =>
    tx.order.findUnique({ where: { idempotencyKey: req.idempotencyKey }, select: { id: true, reference: true, userId: true } }),
  );
  if (existing) {
    if (existing.userId !== user.id) throw new BookingError("Duplicate request", "conflict");
    return {
      orderId: existing.id,
      reference: existing.reference,
      quote,
      whatsappUrl: encodeConciergeLink(waPhone, { reference: existing.reference, cart: req, quote }).url,
      callUrl: telUrl(e.NEXT_PUBLIC_CONCIERGE_PHONE),
    };
  }

  const reference = orderReference();
  let splitToken: string | undefined;
  let sos: SosAvailability | undefined;

  const order = await withUser(user, async (tx) => {
    let zoneId: string | undefined;
    if (req.express) {
      sos = await checkSos(tx, req.address.pincode, req.lines, now);
      if (!sos.ok) throw new BookingError("SOS express isn't available for this order", "sos", sos);
      zoneId = sos.zone!.id;
      // Throwing rolls back any partial decrements.
      if (!(await reserveSosStock(tx, zoneId, req.lines))) throw new BookingError("Just sold out — try another kit", "sos");
    }

    const address = await tx.address.create({
      data: { userId: user.id, label: "Event", payloadEnc: encryptJson(req.address), pincode: req.address.pincode },
    });

    const created = await tx.order.create({
      data: {
        reference,
        idempotencyKey: req.idempotencyKey,
        userId: user.id,
        status: req.channel === "WHATSAPP" ? "NEW" : "PENDING_PAYMENT",
        channel: req.express ? "SOS_EXPRESS" : req.channel,
        paymentPlan: req.paymentPlan,
        priority: req.express ? 10 : 0,
        addressId: address.id,
        zoneId,
        eventDate: new Date(`${req.event.date}T00:00:00${IST_OFFSET}`),
        slotStart: slot.start,
        slotEnd: slot.end,
        guestCount: req.event.guestCount,
        ageGroup: req.event.ageGroup,
        theme: req.event.theme,
        notesEnc: req.event.notes ? encrypt(req.event.notes) : null,
        subtotalPaise: quote.subtotal,
        discountPaise: quote.discount,
        expressFeePaise: quote.expressFee,
        taxPaise: quote.tax,
        totalPaise: quote.total,
        depositPaise: req.paymentPlan === "DEPOSIT" ? quote.deposit : 0,
        currency: CURRENCY,
        lines: {
          create: [
            ...req.lines.map((l, i) => ({
              kind: "box",
              label: l.label,
              // Frozen snapshot incl. names, so later catalog edits don't rewrite history.
              spec: {
                ...l.spec,
                names: Object.fromEntries(Object.keys(l.spec.items).map((id) => [id, CATALOG_BY_ID.get(id)?.name ?? id])),
              } as Prisma.InputJsonValue,
              quantity: l.quantity,
              unitPricePaise: quote.lines[i]!.unit,
              linePaise: quote.lines[i]!.line,
            })),
            ...quote.decor.map((d) => ({
              kind: "decor",
              label: d.name,
              spec: { kitId: d.id } as Prisma.InputJsonValue,
              quantity: 1,
              unitPricePaise: d.price,
              linePaise: d.price,
            })),
          ],
        },
        decorBookings: {
          create: quote.decor.map((d) => ({
            kitId: d.id,
            installStart: new Date(slot.start.getTime() - 2 * 3_600_000),
            installEnd: slot.start,
          })),
        },
        events: { create: { to: req.channel === "WHATSAPP" ? "NEW" : "PENDING_PAYMENT", actorId: user.id, note: `Booked via ${req.channel}` } },
      },
      select: { id: true },
    });

    if (req.paymentPlan === "SPLIT") {
      splitToken = randomToken(24);
      await tx.splitPayLink.create({
        data: {
          orderId: created.id,
          tokenHash: sha256(splitToken),
          targetPaise: quote.total,
          suggestedShares: Math.min(20, Math.max(2, Math.ceil(req.event.guestCount / 6))),
          expiresAt: new Date(now.getTime() + SPLIT_LINK_DAYS * 86_400_000),
        },
      });
    }
    return created;
  });

  const result: BookingResult = {
    orderId: order.id,
    reference,
    quote,
    sos,
    whatsappUrl: encodeConciergeLink(waPhone, {
      reference,
      cart: req,
      quote,
      event: req.event,
      address: req.address,
      paymentPlan: req.paymentPlan,
    }).url,
    callUrl: telUrl(e.NEXT_PUBLIC_CONCIERGE_PHONE),
  };

  if (splitToken) {
    result.split = {
      url: `${e.NEXT_PUBLIC_APP_URL}/pay/${splitToken}`,
      expiresAt: new Date(now.getTime() + SPLIT_LINK_DAYS * 86_400_000).toISOString(),
    };
  }

  const due = dueNow(req, quote);
  if (req.channel === "WEB" && due.amount > 0) {
    result.payment = await startPayment({
      provider: req.provider,
      orderId: order.id,
      reference,
      amount: due.amount,
      purpose: due.purpose,
      idempotencyKey: req.idempotencyKey,
      prefill: { name: req.address.recipientName, contact: req.address.recipientPhone },
      returnPath: `/dashboard/orders/${order.id}`,
    });
  }
  return result;
}

/** Creates a gateway payment and records it. Shared by checkout, balance and split-pay. */
export async function startPayment(p: {
  provider: ProviderName;
  orderId: string;
  reference: string;
  amount: number;
  purpose: PaymentPurpose;
  idempotencyKey: string;
  returnPath: string;
  prefill?: { name?: string; contact?: string };
  contributionId?: string;
}): Promise<ClientPayment> {
  const gateway = GATEWAYS[p.provider];
  const { providerRef, client } = await gateway.create({
    orderId: p.orderId,
    reference: p.reference,
    amount: p.amount,
    currency: CURRENCY,
    purpose: p.purpose,
    description: `Festoon ${p.reference} · ${p.purpose}`,
    returnPath: p.returnPath,
    idempotencyKey: `${p.idempotencyKey}:${p.purpose}`,
    prefill: p.prefill,
    metadata: p.contributionId ? { contributionId: p.contributionId } : undefined,
  });
  await withSystem((tx) =>
    tx.payment.create({
      data: {
        orderId: p.orderId,
        provider: p.provider,
        providerRef,
        purpose: p.purpose,
        amountPaise: p.amount,
        contributionId: p.contributionId,
      },
    }),
  );
  return client;
}

/**
 * Marks a payment captured exactly once and advances the order. Called from
 * verified webhooks and the Razorpay checkout callback; safe to call repeatedly.
 */
export async function confirmPayment(providerRef: string, raw: unknown): Promise<void> {
  await withSystem(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { providerRef }, include: { order: true } });
    if (!payment || payment.status === "CAPTURED") return;

    await tx.payment.update({ where: { id: payment.id }, data: { status: "CAPTURED", raw: raw as Prisma.InputJsonValue } });
    const order = await tx.order.update({
      where: { id: payment.orderId },
      data: { paidPaise: { increment: payment.amountPaise } },
    });

    if (payment.contributionId) {
      const c = await tx.splitContribution.update({ where: { id: payment.contributionId }, data: { paid: true } });
      const link = await tx.splitPayLink.update({ where: { id: c.linkId }, data: { raisedPaise: { increment: c.amountPaise } } });
      if (link.raisedPaise >= link.targetPaise) await tx.splitPayLink.update({ where: { id: link.id }, data: { closedAt: new Date() } });
    }

    // Deposit, full payment or a fully funded split all release the order to the kitchen.
    const funded = order.paidPaise >= (order.paymentPlan === "DEPOSIT" ? order.depositPaise : order.totalPaise);
    if (order.status === "PENDING_PAYMENT" && funded) {
      await tx.order.update({ where: { id: order.id }, data: { status: "NEW" } });
      await tx.orderEvent.create({ data: { orderId: order.id, from: "PENDING_PAYMENT", to: "NEW", note: `Payment ${providerRef} captured` } });
    }
  });
}

export async function failPayment(providerRef: string, raw: unknown): Promise<void> {
  await withSystem((tx) =>
    tx.payment.updateMany({
      where: { providerRef, status: { in: ["CREATED", "AUTHORIZED"] } },
      data: { status: "FAILED", raw: raw as Prisma.InputJsonValue },
    }),
  );
}
