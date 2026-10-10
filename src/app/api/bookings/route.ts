import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createBooking } from "@/lib/booking/engine";
import { bookingRequestSchema } from "@/lib/booking/schema";
import { handle, readJson } from "@/lib/server/http";

/** Checkout is gated: guests can build and price freely, but booking needs an OTP session. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const body = await readJson(req, bookingRequestSchema);
  const result = await createBooking(user, body);
  return NextResponse.json(result, { status: 201 });
});
