import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Customer metadata at rest: AES-256-GCM with a random 96-bit IV per value.
 * Ciphertext format: `v1.<iv>.<tag>.<data>` (base64url). The version prefix
 * leaves room for key rotation without a data migration.
 */
export function encrypt(plaintext: string): string {
  const key = Buffer.from(env().DATA_ENCRYPTION_KEY, "base64").subarray(0, 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decrypt(payload: string): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unsupported ciphertext");
  const key = Buffer.from(env().DATA_ENCRYPTION_KEY, "base64").subarray(0, 32);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export const encryptJson = (value: unknown) => encrypt(JSON.stringify(value));
export const decryptJson = <T>(payload: string): T => JSON.parse(decrypt(payload)) as T;

/** Deterministic keyed hash for equality lookups on encrypted PII (email, phone, IP). */
export function lookupHash(value: string): string {
  return createHmac("sha256", env().HASH_PEPPER).update(value.trim().toLowerCase()).digest("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Unambiguous uppercase reference, e.g. FST-7K2Q9M. */
export function orderReference(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(6);
  return `FST-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}
