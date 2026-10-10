import "server-only";
import { createHmac } from "node:crypto";
import { env } from "@/lib/server/env";
import { safeEqual } from "@/lib/server/crypto";
import { GatewayError, type PaymentGateway } from "./types";

function credentials() {
  const { RAZORPAY_KEY_ID: id, RAZORPAY_KEY_SECRET: secret } = env();
  if (!id || !secret) throw new GatewayError("Razorpay is not configured");
  return { id, secret };
}

export const razorpay: PaymentGateway = {
  provider: "RAZORPAY",
  async create(input) {
    const { id, secret } = credentials();
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        receipt: `${input.reference}-${input.purpose}`.slice(0, 40),
        notes: { orderId: input.orderId, purpose: input.purpose, ...input.metadata },
      }),
    });
    if (!res.ok) throw new GatewayError(`Razorpay order failed (${res.status})`);
    const order = (await res.json()) as { id: string };
    return {
      providerRef: order.id,
      client: {
        provider: "RAZORPAY",
        keyId: id,
        orderId: order.id,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        prefill: input.prefill,
      },
    };
  },
};

/** Checkout handler callback: signature = HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyRazorpayCheckout(orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac("sha256", credentials().secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

/** Webhook: signature = HMAC_SHA256(raw body, webhook secret). */
export function verifyRazorpayWebhook(rawBody: string, signature: string | null): boolean {
  const secret = env().RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqual(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}
