import "server-only";
import { z } from "zod";

const base64Key = (bytes: number) =>
  z.string().refine((v) => Buffer.from(v, "base64").length >= bytes, `must be ≥${bytes} bytes, base64-encoded`);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_CONCIERGE_WHATSAPP: z.string().regex(/^\d{10,15}$/),
  NEXT_PUBLIC_CONCIERGE_PHONE: z.string().min(8),

  DATABASE_URL: z.string().min(1),

  SESSION_SECRET: base64Key(32),
  DATA_ENCRYPTION_KEY: base64Key(32),
  HASH_PEPPER: z.string().min(16),

  UPSTASH_REDIS_REST_URL: z.url().optional().or(z.literal("")),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  OTP_PROVIDER: z.enum(["console", "whatsapp", "twilio"]).default("console"),
  WHATSAPP_CLOUD_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_OTP_TEMPLATE: z.string().default("otp_login"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * Validated lazily so `next build` can run without secrets; the first request
 * that needs configuration fails loudly instead of limping along.
 */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  if (parsed.data.NODE_ENV === "production" && parsed.data.OTP_PROVIDER === "console") {
    throw new Error("OTP_PROVIDER=console is not allowed in production");
  }
  cached = parsed.data;
  return cached;
}
