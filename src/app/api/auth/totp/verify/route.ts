import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { PENDING_2FA_COOKIE, verifyPending2fa } from "@/lib/auth/token";
import { verifyTotp } from "@/lib/auth/totp";
import { decrypt } from "@/lib/server/crypto";
import { withSystem } from "@/lib/server/db";
import { HttpError, handle, readJson } from "@/lib/server/http";
import { enforce } from "@/lib/server/rate-limit";

const schema = z.object({ code: z.string().regex(/^\d{6}$/) });

/** Step 2 of sign-in: authenticator code against the pending-2FA cookie. */
export const POST = handle(async (req: Request) => {
  const { code } = await readJson(req, schema);
  const uid = await verifyPending2fa((await cookies()).get(PENDING_2FA_COOKIE)?.value);
  if (!uid) throw new HttpError(401, "Your sign-in expired. Start again.");
  await enforce(["totpVerify", uid]);

  const user = await withSystem((tx) => tx.user.findUnique({ where: { id: uid } }));
  if (!user?.totpSecretEnc || !user.totpEnabledAt) throw new HttpError(400, "Authenticator not set up");
  if (!verifyTotp(decrypt(user.totpSecretEnc), code)) throw new HttpError(400, "Incorrect code");

  await createSession(user, "otp+totp");
  return NextResponse.json({ next: "done" });
});
