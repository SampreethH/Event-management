import { CATALOG_BY_ID } from "@/lib/domain/catalog";
import { formatPaise } from "@/lib/domain/money";
import type { OrderQuote } from "./quote";
import type { AddressInput, CartInput, EventInput } from "./schema";

/**
 * WhatsApp Direct-Sync payload encoder.
 *
 * Builds a structured, human-readable brief for the concierge line and wraps it
 * in a wa.me deep link. Long carts are compacted in stages so the final URL
 * stays under the length that mobile browsers and WhatsApp reliably accept.
 */

export interface ConciergePayload {
  reference?: string;
  customerName?: string;
  cart: CartInput;
  quote: OrderQuote;
  event?: Partial<EventInput>;
  address?: Partial<AddressInput>;
  paymentPlan?: "FULL" | "DEPOSIT" | "SPLIT";
}

/** Practical ceiling for a wa.me URL across iOS/Android share sheets. */
export const MAX_URL_LENGTH = 3800;

const AGE_LABEL = { KIDS: "Kids", TEENS: "Teens", ADULTS: "Adults", MIXED: "Mixed ages" } as const;
const PLAN_LABEL = { FULL: "Pay in full", DEPOSIT: "30% advance, balance on delivery", SPLIT: "Group split-pay link" } as const;

/** Neutralise WhatsApp formatting characters in user-supplied text so it can't restyle the brief. */
export function sanitizeForWhatsApp(input: string | undefined): string {
  if (!input) return "";
  return input
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const name = (id: string) => CATALOG_BY_ID.get(id)?.name ?? id;

type Detail = "full" | "compact" | "minimal";

export function buildConciergeMessage(p: ConciergePayload, detail: Detail = "full"): string {
  const out: string[] = [];
  const push = (...l: string[]) => out.push(...l);

  push(`*New celebration brief*${p.reference ? ` · ${p.reference}` : ""}`);
  if (p.customerName) push(`Host: ${sanitizeForWhatsApp(p.customerName)}`);
  push("");

  push("*Boxes*");
  p.cart.lines.forEach((line, i) => {
    const s = line.spec;
    push(`${i + 1}. ${sanitizeForWhatsApp(line.label)} × ${line.quantity}`);
    if (detail === "minimal") return;
    const ribbon = s.ribbonText ? ` · "${sanitizeForWhatsApp(s.ribbonText)}"` : "";
    push(`   Sleeve: ${name(s.sleeveId)} · Ribbon: ${name(s.ribbonId)}${ribbon}`);
    const items = Object.entries(s.items);
    if (detail === "full") {
      for (const [id, qty] of items) push(`   • ${name(id)}${qty > 1 ? ` ×${qty}` : ""}`);
    } else {
      push(`   ${items.length} items: ${items.map(([id]) => name(id).split(" ")[0]).join(", ")}`);
    }
  });

  if (p.quote.decor.length) {
    push("", "*Decor*");
    for (const d of p.quote.decor) push(`• ${d.name}`);
  }

  if (p.event) {
    const e = p.event;
    push("", "*Event*");
    if (p.cart.express) push("⚡ SOS express — 60–90 min dispatch");
    if (e.date) push(`Date: ${e.date}${e.slot && e.slot !== "express" ? ` · Slot ${e.slot}` : ""}`);
    if (e.guestCount) push(`Guests: ${e.guestCount}${e.ageGroup ? ` (${AGE_LABEL[e.ageGroup]})` : ""}`);
    if (e.theme) push(`Theme: ${e.theme}`);
    if (e.notes && detail === "full") push(`Notes: ${sanitizeForWhatsApp(e.notes).slice(0, 240)}`);
  }

  if (p.address) {
    const a = p.address;
    push("", "*Deliver to*");
    if (a.recipientName) push(sanitizeForWhatsApp(a.recipientName));
    if (detail !== "minimal") {
      const street = [a.line1, a.line2, a.landmark].map(sanitizeForWhatsApp).filter(Boolean).join(", ");
      if (street) push(street);
    }
    push([sanitizeForWhatsApp(a.city), a.pincode].filter(Boolean).join(" "));
  }

  const q = p.quote;
  push("", "*Estimate*");
  push(`${q.totalBoxes} boxes · ${q.tier.label} tier${q.discount ? ` (−${formatPaise(q.discount)})` : ""}`);
  if (q.expressFee) push(`Express fee: ${formatPaise(q.expressFee)}`);
  push(`Total incl. GST: *${formatPaise(q.total)}*`);
  if (p.paymentPlan) push(`Payment: ${PLAN_LABEL[p.paymentPlan]}`);

  return out.join("\n");
}

export function whatsappUrl(phoneDigits: string, message: string): string {
  const digits = phoneDigits.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Full → compact → minimal, returning the richest version that fits. */
export function encodeConciergeLink(phoneDigits: string, payload: ConciergePayload): { url: string; detail: Detail } {
  for (const detail of ["full", "compact", "minimal"] as const) {
    const url = whatsappUrl(phoneDigits, buildConciergeMessage(payload, detail));
    if (url.length <= MAX_URL_LENGTH) return { url, detail };
  }
  const fallback = `*New celebration brief*${payload.reference ? ` · ${payload.reference}` : ""}\n${payload.quote.totalBoxes} boxes · ${formatPaise(payload.quote.total)}\nFull spec is attached to the order in our system.`;
  return { url: whatsappUrl(phoneDigits, fallback), detail: "minimal" };
}

export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
