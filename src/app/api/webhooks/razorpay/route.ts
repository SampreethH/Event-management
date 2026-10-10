import { NextResponse } from "next/server";
import { confirmPayment, failPayment } from "@/lib/booking/engine";
import { verifyRazorpayWebhook } from "@/lib/booking/gateways/razorpay";

interface RazorpayEvent {
  event: string;
  payload: { payment?: { entity: { id: string; order_id: string; status: string } } };
}

/** Exempt from the Origin check in proxy.ts; authenticated by HMAC signature instead. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyRazorpayWebhook(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const evt = JSON.parse(raw) as RazorpayEvent;
  const p = evt.payload.payment?.entity;
  if (p) {
    if (evt.event === "payment.captured" || evt.event === "order.paid") await confirmPayment(p.order_id, { paymentId: p.id, event: evt.event });
    if (evt.event === "payment.failed") await failPayment(p.order_id, { paymentId: p.id, event: evt.event });
  }
  return NextResponse.json({ received: true });
}
