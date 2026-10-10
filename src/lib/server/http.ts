import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AuthError } from "@/lib/auth/session";
import { OtpError } from "@/lib/auth/otp";
import { BookingError } from "@/lib/booking/engine";
import { GatewayError } from "@/lib/booking/gateways/types";
import { RateLimitError } from "./rate-limit";

const MAX_BODY_BYTES = 64 * 1024;

/** Parses and validates a JSON body with a hard size cap. */
export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "Request too large");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Malformed JSON");
  }
  return schema.parse(data);
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Maps domain errors to safe HTTP responses; unknown errors never leak details. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json({ error: "Invalid input", issues: err.issues.map((i) => ({ path: i.path, message: i.message })) }, { status: 422 });
      }
      if (err instanceof RateLimitError) {
        return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } });
      }
      if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
      if (err instanceof OtpError) return NextResponse.json({ error: err.message }, { status: 400 });
      if (err instanceof BookingError) return NextResponse.json({ error: err.message, code: err.code, detail: err.detail }, { status: 409 });
      if (err instanceof GatewayError) {
        console.error("[gateway]", err.message);
        return NextResponse.json({ error: "Payment provider is unavailable. Try again or book on WhatsApp." }, { status: 502 });
      }
      if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
      console.error("[api] unhandled", err);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
