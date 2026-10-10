import { describe, expect, it } from "vitest";
import { quoteOrder } from "./quote";
import { MAX_URL_LENGTH, buildConciergeMessage, encodeConciergeLink, sanitizeForWhatsApp } from "./whatsapp";
import type { CartInput } from "./schema";

const line = {
  label: "Birthday box",
  quantity: 24,
  spec: { sleeveId: "sleeve-lavender-haze", ribbonId: "ribbon-gold-satin", ribbonText: "Happy 30th *Riya*", items: { "snack-nachos-salsa": 1, "cake-red-velvet": 1 } },
};
const cart: CartInput = { lines: [line], decor: ["neon-backdrop"], express: false };

describe("WhatsApp encoder", () => {
  it("strips formatting characters from user text", () => {
    expect(sanitizeForWhatsApp("*bold* _it_ ~s~ `c`\nnew")).toBe("bold it s c new");
  });

  it("includes boxes, decor, event, address and totals", () => {
    const msg = buildConciergeMessage({
      reference: "FST-ABC123",
      cart,
      quote: quoteOrder(cart),
      event: { date: "2026-11-02", slot: "16:00-18:00", guestCount: 24, ageGroup: "ADULTS", theme: "Neon night" },
      address: { recipientName: "Riya", line1: "12 MG Road", city: "Bengaluru", pincode: "560001" },
      paymentPlan: "DEPOSIT",
    });
    expect(msg).toContain("FST-ABC123");
    expect(msg).toContain("Birthday box × 24");
    expect(msg).toContain('"Happy 30th Riya"');
    expect(msg).toContain("Neon backdrop wall");
    expect(msg).toContain("Slot 16:00-18:00");
    expect(msg).toContain("Bengaluru 560001");
    expect(msg).toContain("30% advance");
  });

  it("produces a wa.me URL that round-trips", () => {
    const { url } = encodeConciergeLink("+91 98000 00000", { cart, quote: quoteOrder(cart) });
    expect(url.startsWith("https://wa.me/919800000000?text=")).toBe(true);
    const text = decodeURIComponent(url.split("?text=")[1]!);
    expect(text).toContain("Birthday box × 24");
  });

  it("compacts large carts to stay under the URL ceiling", () => {
    const big: CartInput = {
      lines: Array.from({ length: 10 }, (_, i) => ({
        ...line,
        label: `Design number ${i + 1} with a long name`,
        spec: { ...line.spec, items: { "snack-nachos-salsa": 1, "snack-masala-makhana": 1, "snack-trail-mix": 1, "snack-caramel-popcorn": 1, "cake-red-velvet": 1, "conf-macaron-duo": 1, "conf-kaju-katli": 1, "favor-tote": 1, "favor-mini-candle": 1 } },
      })),
      decor: [],
      express: false,
    };
    const { url, detail } = encodeConciergeLink("919800000000", { cart: big, quote: quoteOrder(big) });
    expect(url.length).toBeLessThanOrEqual(MAX_URL_LENGTH);
    expect(detail).not.toBe("full");
  });
});

describe("order quote", () => {
  it("applies the bulk tier across all lines combined", () => {
    const split: CartInput = { lines: [{ ...line, quantity: 15 }, { ...line, quantity: 15 }], decor: [], express: false };
    expect(quoteOrder(split).tier.minQty).toBe(25);
  });
  it("taxes decor and express at the service rate and rounds deposit up to a rupee", () => {
    const q = quoteOrder({ ...cart, express: true });
    expect(q.expressFee).toBeGreaterThan(0);
    expect(q.deposit % 100).toBe(0);
    expect(q.deposit).toBeGreaterThanOrEqual(q.total * 0.3);
  });
});
