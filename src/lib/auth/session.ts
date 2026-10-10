import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { withSystem } from "@/lib/server/db";
import { lookupHash } from "@/lib/server/crypto";
import {
  PENDING_2FA_COOKIE,
  PENDING_TTL_SECONDS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  isStaffRole,
  signPending2fa,
  signSession,
  verifySession,
  type AppRole,
} from "./token";

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export interface CurrentUser {
  id: string;
  role: AppRole;
  sessionId: string;
  factors: string;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
}

export async function createSession(user: { id: string; role: AppRole }, factors: string): Promise<void> {
  const h = await headers();
  const ip = await clientIp();
  const session = await withSystem((tx) =>
    tx.session.create({
      data: {
        userId: user.id,
        factors,
        userAgent: h.get("user-agent")?.slice(0, 200),
        ipHash: lookupHash(ip),
        expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
      },
    }),
  );
  const token = await signSession({ sid: session.id, uid: user.id, role: user.role, f: factors });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { ...cookieBase, maxAge: SESSION_TTL_SECONDS });
  jar.delete(PENDING_2FA_COOKIE);
}

export async function setPending2fa(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(PENDING_2FA_COOKIE, await signPending2fa(userId), {
    ...cookieBase,
    sameSite: "strict",
    maxAge: PENDING_TTL_SECONDS,
  });
}

/** Verifies the JWT *and* the DB row, so logout/revocation is immediate. Memoised per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const claims = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const row = await withSystem((tx) =>
    tx.session.findUnique({ where: { id: claims.sid }, select: { revokedAt: true, expiresAt: true, user: { select: { role: true } } } }),
  );
  if (!row || row.revokedAt || row.expiresAt < new Date()) return null;
  // Role comes from the DB, not the token, so demotions apply without waiting for expiry.
  return { id: claims.uid, role: row.user.role, sessionId: claims.sid, factors: claims.f };
});

export class AuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
  }
}

/** Staff and admins must have passed TOTP in this session; customers need OTP. */
export async function requireUser(opts: { staff?: boolean; roles?: AppRole[] } = {}): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, "Sign in required");
  if (opts.staff && !isStaffRole(user.role)) throw new AuthError(403, "Staff only");
  if (opts.roles && !opts.roles.includes(user.role)) throw new AuthError(403, "Not permitted");
  if (isStaffRole(user.role) && !user.factors.includes("totp")) throw new AuthError(403, "Authenticator code required");
  return user;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const claims = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (claims) {
    await withSystem((tx) => tx.session.updateMany({ where: { id: claims.sid, revokedAt: null }, data: { revokedAt: new Date() } }));
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(PENDING_2FA_COOKIE);
}
