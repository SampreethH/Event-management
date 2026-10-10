import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { PENDING_2FA_COOKIE, verifyPending2fa } from "@/lib/auth/token";
import { generateTotpSecret, otpauthUri } from "@/lib/auth/totp";
import { encrypt } from "@/lib/server/crypto";
import { withSystem } from "@/lib/server/db";
import { HttpError, handle } from "@/lib/server/http";

/**
 * Starts authenticator enrolment. Allowed for a signed-in user, or for staff
 * mid-login (pending-2FA cookie) who haven't enrolled yet.
 */
export const POST = handle(async () => {
  const current = await getCurrentUser();
  const uid = current?.id ?? (await verifyPending2fa((await cookies()).get(PENDING_2FA_COOKIE)?.value));
  if (!uid) throw new HttpError(401, "Sign in required");

  const secret = generateTotpSecret();
  await withSystem(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: uid } });
    if (user.totpEnabledAt) throw new HttpError(409, "Authenticator already enabled");
    await tx.user.update({ where: { id: uid }, data: { totpSecretEnc: encrypt(secret) } });
  });
  return NextResponse.json({ secret, uri: otpauthUri(secret, `user-${uid.slice(-6)}`) });
});
