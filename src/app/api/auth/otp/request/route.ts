import { NextResponse } from "next/server";
import { clientIp } from "@/lib/auth/session";
import { otpRequestSchema, requestOtp } from "@/lib/auth/otp";
import { handle, readJson } from "@/lib/server/http";

export const POST = handle(async (req: Request) => {
  const body = await readJson(req, otpRequestSchema);
  const { challengeId, channel } = await requestOtp(body, await clientIp());
  return NextResponse.json({ challengeId, channel });
});
