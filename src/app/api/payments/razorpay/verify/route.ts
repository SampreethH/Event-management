import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmPayment } from "@/lib/booking/engine";
import { verifyRazorpayCheckout } from "@/lib/booking/gateways/razorpay";
import { HttpError, handle, readJson } from "@/lib/server/http";

const schema = z.object({
  razorpay_order_id: z.string().max(64),
  razorpay_payment_id: z.string().max(64),
  razorpay_signature: z.string().max(128),
});

/**
 * Fast-path confirmation from the Checkout handler so the customer sees
 * "Confirmed" immediately. The webhook remains the source of truth and is idempotent.
 */
export const POST = handle(async (req: Request) => {
  const body = await readJson(req, schema);
  if (!verifyRazorpayCheckout(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
    throw new HttpError(400, "Signature mismatch");
  }
  await confirmPayment(body.razorpay_order_id, { paymentId: body.razorpay_payment_id, via: "checkout" });
  return NextResponse.json({ ok: true });
});
