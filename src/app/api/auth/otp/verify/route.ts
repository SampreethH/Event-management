import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, createSession, setPending2fa } from "@/lib/auth/session";
import { otpVerifySchema, verifyOtp } from "@/lib/auth/otp";
import { isStaffRole } from "@/lib/auth/token";
import { handle, readJson } from "@/lib/server/http";

const schema = otpVerifySchema.extend({ identifier: z.string().trim().min(5).max(120) });

/**
 * Step 1 of sign-in. Customers without an authenticator get a session now;
 * anyone with TOTP enrolled (and all staff) must complete step 2.
 */
export const POST = handle(async (req: Request) => {
  const { identifier, ...input } = await readJson(req, schema);
  const user = await verifyOtp(input, identifier, await clientIp());

  if (user.totpEnabled || isStaffRole(user.role)) {
    await setPending2fa(user.id);
    return NextResponse.json({ next: user.totpEnabled ? "totp" : "enroll-totp" });
  }
  await createSession(user, "otp");
  return NextResponse.json({ next: "done" });
});
