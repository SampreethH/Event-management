import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { handle } from "@/lib/server/http";

export const GET = handle(async () => {
  const user = await getCurrentUser();
  return NextResponse.json(
    user ? { signedIn: true, role: user.role, twoFactor: user.factors.includes("totp") } : { signedIn: false },
    { headers: { "Cache-Control": "no-store" } },
  );
});
