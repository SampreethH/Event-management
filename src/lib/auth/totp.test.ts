import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, generateTotpSecret, totp, verifyTotp } from "./totp";

// RFC 6238 Appendix B, SHA-1 seed "12345678901234567890" (last 6 digits of the 8-digit vectors).
const SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("TOTP", () => {
  it("round-trips base32", () => {
    const buf = Buffer.from([0, 1, 2, 250, 251, 255, 17]);
    expect(base32Decode(base32Encode(buf))).toEqual(buf);
    expect(SECRET).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  });

  it.each([
    [59, "287082"],
    [1111111109, "081804"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ])("matches RFC 6238 at T=%i", (t, code) => {
    expect(totp(SECRET, t * 1000)).toBe(code);
  });

  it("tolerates ±1 step of drift but no more", () => {
    const now = 1_700_000_000_000;
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, totp(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totp(secret, now + 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totp(secret, now - 90_000), now)).toBe(false);
    expect(verifyTotp(secret, "12345", now)).toBe(false);
  });
});
