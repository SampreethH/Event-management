import "server-only";
import { createHmac } from "node:crypto";
import { env } from "@/lib/server/env";
import { safeEqual } from "@/lib/server/crypto";
import { GatewayError, type PaymentGateway } from "./types";

/** Stripe Checkout Sessions over the REST API (no SDK needed for this surface). */
export const stripe: PaymentGateway = {
  provider: "STRIPE",
  async create(input) {
    const { STRIPE_SECRET_KEY: key, NEXT_PUBLIC_APP_URL: appUrl } = env();
    if (!key) throw new GatewayError("Stripe is not configured");

    const form = new URLSearchParams({
      mode: "payment",
      client_reference_id: input.orderId,
      success_url: `${appUrl}${input.returnPath}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}${input.returnPath}?cancelled=1`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": input.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(input.amount),
      "line_items[0][price_data][product_data][name]": input.description,
      "metadata[orderId]": input.orderId,
      "metadata[purpose]": input.purpose,
      "payment_intent_data[metadata][orderId]": input.orderId,
      "payment_intent_data[metadata][purpose]": input.purpose,
    });
    for (const [k, v] of Object.entries(input.metadata ?? {})) form.set(`metadata[${k}]`, v);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: form,
    });
    if (!res.ok) throw new GatewayError(`Stripe session failed (${res.status})`);
    const session = (await res.json()) as { id: string; url: string };
    return { providerRef: session.id, client: { provider: "STRIPE", checkoutUrl: session.url } };
  },
};

const TOLERANCE_SECONDS = 300;

/** Verifies the `Stripe-Signature` header (t=…,v1=…) against the raw body. */
export function verifyStripeWebhook(rawBody: string, header: string | null, now = Date.now()): boolean {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = new Map<string, string[]>();
  for (const kv of header.split(",")) {
    const [k, v] = kv.split("=");
    if (k && v) parts.set(k, [...(parts.get(k) ?? []), v]);
  }
  const t = parts.get("t")?.[0];
  if (!t || Math.abs(now / 1000 - Number(t)) > TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return (parts.get("v1") ?? []).some((sig) => safeEqual(sig, expected));
}
