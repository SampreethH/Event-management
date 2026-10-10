import "server-only";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { withSystem } from "@/lib/server/db";
import { encrypt, lookupHash, safeEqual } from "@/lib/server/crypto";
import { enforce } from "@/lib/server/rate-limit";
import { phoneSchema } from "@/lib/booking/schema";
import { deliverOtp, type DeliveryChannel } from "./otp-delivery";
import type { AppRole } from "./token";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export const otpRequestSchema = z.object({
  identifier: z.string().trim().min(5).max(120),
  channel: z.enum(["SMS", "WHATSAPP", "EMAIL"]).optional(),
});

export const otpVerifySchema = z.object({
  challengeId: z.string().cuid(),
  code: z.string().regex(/^\d{6}$/),
});

type Identifier = { kind: "email" | "phone"; value: string };

export function parseIdentifier(raw: string): Identifier | null {
  const email = z.email().safeParse(raw.trim().toLowerCase());
  if (email.success) return { kind: "email", value: email.data };
  const phone = phoneSchema.safeParse(raw);
  if (phone.success) {
    // Default to India when no country code is given.
    const digits = phone.data.startsWith("+") ? phone.data : `+91${phone.data.replace(/^0/, "")}`;
    return { kind: "phone", value: digits };
  }
  return null;
}

const codeHash = (challengeKey: string, code: string) => lookupHash(`otp:${challengeKey}:${code}`);

/**
 * Issues a challenge. Always resolves with a challenge id — even for unknown or
 * rate-limited identifiers we don't reveal whether an account exists.
 */
export async function requestOtp(input: z.infer<typeof otpRequestSchema>, ip: string): Promise<{ challengeId: string; channel: DeliveryChannel }> {
  const id = parseIdentifier(input.identifier);
  if (!id) throw new OtpError("Enter a valid email or mobile number");
  const channel: DeliveryChannel = id.kind === "email" ? "EMAIL" : input.channel === "WHATSAPP" ? "WHATSAPP" : "SMS";
  const identifierHash = lookupHash(id.value);
  const ipHash = lookupHash(ip);

  await enforce(["otpRequestById", identifierHash], ["otpRequestByIp", ipHash]);

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const challenge = await withSystem(async (tx) => {
    // Invalidate earlier open challenges for this identifier.
    await tx.otpChallenge.updateMany({ where: { identifierHash, consumedAt: null }, data: { consumedAt: new Date() } });
    const c = await tx.otpChallenge.create({
      data: { identifierHash, channel, codeHash: "pending", expiresAt: new Date(Date.now() + OTP_TTL_MS), ipHash },
    });
    // Bind the code to the challenge id so a hash can't be replayed on another challenge.
    return tx.otpChallenge.update({ where: { id: c.id }, data: { codeHash: codeHash(c.id, code) } });
  });

  await deliverOtp(channel, id.value, code);
  return { challengeId: challenge.id, channel };
}

export class OtpError extends Error {}

/**
 * Verifies a code and returns the user (created on first sign-in). The caller
 * decides whether a TOTP step is still owed.
 */
export async function verifyOtp(
  input: z.infer<typeof otpVerifySchema>,
  identifierRaw: string,
  ip: string,
): Promise<{ id: string; role: AppRole; totpEnabled: boolean }> {
  const id = parseIdentifier(identifierRaw);
  if (!id) throw new OtpError("Invalid code");
  const identifierHash = lookupHash(id.value);
  await enforce(["otpVerify", `${identifierHash}:${lookupHash(ip)}`]);

  // Failures return instead of throwing so the attempt counter commits.
  const result = await withSystem(async (tx) => {
    const c = await tx.otpChallenge.findUnique({ where: { id: input.challengeId } });
    if (!c || c.identifierHash !== identifierHash || c.consumedAt || c.expiresAt < new Date() || c.attempts >= MAX_ATTEMPTS) {
      return { error: "This code has expired. Request a new one." } as const;
    }
    const ok = safeEqual(c.codeHash, codeHash(c.id, input.code));
    await tx.otpChallenge.update({
      where: { id: c.id },
      data: ok ? { consumedAt: new Date(), attempts: { increment: 1 } } : { attempts: { increment: 1 } },
    });
    if (!ok) return { error: c.attempts + 1 >= MAX_ATTEMPTS ? "Too many attempts. Request a new code." : "Incorrect code" } as const;

    const where = id.kind === "email" ? { emailHash: identifierHash } : { phoneHash: identifierHash };
    const user =
      (await tx.user.findUnique({ where })) ??
      (await tx.user.create({
        data: id.kind === "email" ? { emailHash: identifierHash, emailEnc: encrypt(id.value) } : { phoneHash: identifierHash, phoneEnc: encrypt(id.value) },
      }));
    return { user: { id: user.id, role: user.role, totpEnabled: Boolean(user.totpEnabledAt) } } as const;
  });
  if ("error" in result) throw new OtpError(result.error);
  return result.user;
}
