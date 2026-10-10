import { z } from "zod";
import { boxQuantitySchema, boxSpecSchema } from "@/lib/domain/box";
import { DECOR_KITS } from "@/lib/domain/catalog";
import { THEMES } from "@/lib/domain/party-calculator";

export const SLOTS = ["10:00-12:00", "12:00-14:00", "14:00-16:00", "16:00-18:00", "18:00-20:00", "20:00-22:00"] as const;
export type Slot = (typeof SLOTS)[number];

const safeText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    // strip control chars; markup is never rendered as HTML but keep payloads clean
    .transform((s) => s.replace(/[\u0000-\u001F\u007F<>]/g, ""));

export const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^\+?[1-9]\d{9,14}$/, "Enter a valid mobile number with country code"));

export const addressSchema = z.object({
  recipientName: safeText(60).pipe(z.string().min(2)),
  recipientPhone: phoneSchema,
  line1: safeText(120).pipe(z.string().min(4)),
  line2: safeText(120).optional().default(""),
  landmark: safeText(80).optional().default(""),
  city: safeText(40).pipe(z.string().min(2)),
  pincode: z.string().regex(/^\d{6}$/, "6-digit PIN code"),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const eventSchema = z.object({
  date: z.iso.date(),
  slot: z.union([z.enum(SLOTS), z.literal("express")]),
  guestCount: z.number().int().min(1).max(2000),
  ageGroup: z.enum(["KIDS", "TEENS", "ADULTS", "MIXED"]),
  theme: z.enum(THEMES).optional(),
  notes: safeText(500).optional().default(""),
});
export type EventInput = z.infer<typeof eventSchema>;

export const cartLineSchema = z.object({
  label: safeText(60).default("Custom box"),
  spec: boxSpecSchema,
  quantity: boxQuantitySchema,
});
export type CartLine = z.infer<typeof cartLineSchema>;

const decorIds = DECOR_KITS.map((k) => k.id) as [string, ...string[]];

export const cartSchema = z.object({
  lines: z.array(cartLineSchema).min(1).max(10),
  decor: z
    .array(z.enum(decorIds))
    .max(3)
    .default([])
    .refine((a) => new Set(a).size === a.length, "Duplicate decor kit"),
  express: z.boolean().default(false),
});
export type CartInput = z.infer<typeof cartSchema>;

export const PAYMENT_PLANS = ["FULL", "DEPOSIT", "SPLIT"] as const;
export const PROVIDERS = ["RAZORPAY", "STRIPE"] as const;

export const bookingRequestSchema = cartSchema.extend({
  event: eventSchema,
  address: addressSchema,
  paymentPlan: z.enum(PAYMENT_PLANS),
  provider: z.enum(PROVIDERS),
  channel: z.enum(["WEB", "WHATSAPP"]).default("WEB"),
  /** Client-generated; makes double-clicks and retries safe. */
  idempotencyKey: z.string().uuid(),
});
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
