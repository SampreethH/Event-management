import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, getCurrentUser } from "@/lib/auth/session";
import { PENDING_2FA_COOKIE, verifyPending2fa } from "@/lib/auth/token";
import { verifyTotp } from "@/lib/auth/totp";
import { decrypt } from "@/lib/server/crypto";
import { withSystem } from "@/lib/server/db";
import { HttpError, handle, readJson } from "@/lib/server/http";
import { enforce } from "@/lib/server/rate-limit";

const schema = z.object({ code: z.string().regex(/^\d{6}$/) });

/** Confirms enrolment with a first valid code, then upgrades the session to two factors. */
export const POST = handle(async (req: Request) => {
  const { code } = await readJson(req, schema);
  const current = await getCurrentUser();
  const uid = current?.id ?? (await verifyPending2fa((await cookies()).get(PENDING_2FA_COOKIE)?.value));
  if (!uid) throw new HttpError(401, "Sign in required");
  await enforce(["totpVerify", uid]);

  const user = await withSystem((tx) => tx.user.findUniqueOrThrow({ where: { id: uid } }));
  if (!user.totpSecretEnc) throw new HttpError(400, "Start setup first");
  if (!verifyTotp(decrypt(user.totpSecretEnc), code)) throw new HttpError(400, "Incorrect code — check your device clock");

  await withSystem((tx) => tx.user.update({ where: { id: uid }, data: { totpEnabledAt: new Date() } }));
  if (current) await withSystem((tx) => tx.session.update({ where: { id: current.sessionId }, data: { revokedAt: new Date() } }));
  await createSession(user, "otp+totp");
  return NextResponse.json({ next: "done" });
});
