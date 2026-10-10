import { NextResponse } from "next/server";
import { confirmPayment, failPayment } from "@/lib/booking/engine";
import { verifyStripeWebhook } from "@/lib/booking/gateways/stripe";

interface StripeEvent {
  type: string;
  data: { object: { id: string; payment_status?: string } };
}

/** Exempt from the Origin check in proxy.ts; authenticated by signature instead. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyStripeWebhook(raw, req.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const evt = JSON.parse(raw) as StripeEvent;
  const session = evt.data.object;
  switch (evt.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      if (session.payment_status === "paid") await confirmPayment(session.id, { event: evt.type });
      break;
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      await failPayment(session.id, { event: evt.type });
      break;
  }
  return NextResponse.json({ received: true });
}
