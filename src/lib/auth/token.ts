import { SignJWT, jwtVerify } from "jose";

/**
 * JWT helpers with no Node or database dependencies, so `proxy.ts` can gate
 * routes cheaply. Route handlers additionally check the DB session row
 * (see session.ts) so revocation takes effect immediately.
 */

export const SESSION_COOKIE = "fst_session";
export const PENDING_2FA_COOKIE = "fst_2fa";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const PENDING_TTL_SECONDS = 60 * 10;

export type AppRole = "CUSTOMER" | "STAFF" | "DECORATOR" | "ADMIN";

export interface SessionClaims {
  sid: string;
  uid: string;
  role: AppRole;
  /** Factors satisfied: "otp", "totp" or "otp+totp". */
  f: string;
}

const ISSUER = "festoon";

function key(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new Uint8Array(Buffer.from(secret, "base64"));
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience("session")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISSUER, audience: "session", algorithms: ["HS256"] });
    const { sid, uid, role, f } = payload as Partial<SessionClaims>;
    if (!sid || !uid || !role || !f) return null;
    return { sid, uid, role, f };
  } catch {
    return null;
  }
}

/** Short-lived proof that the OTP step passed and a TOTP code is still owed. */
export async function signPending2fa(uid: string): Promise<string> {
  return new SignJWT({ uid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience("2fa")
    .setIssuedAt()
    .setExpirationTime(`${PENDING_TTL_SECONDS}s`)
    .sign(key());
}

export async function verifyPending2fa(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISSUER, audience: "2fa", algorithms: ["HS256"] });
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

export const isStaffRole = (role: AppRole) => role !== "CUSTOMER";
