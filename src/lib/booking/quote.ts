import { FOOD_GST, SERVICE_GST, tierFor, unitPrice, type Tier } from "@/lib/domain/box";
import { DECOR_BY_ID } from "@/lib/domain/catalog";
import { pct, type Paise } from "@/lib/domain/money";
import type { CartInput } from "./schema";

export const EXPRESS_FEE: Paise = 49900;
export const DEPOSIT_RATE = 0.3;

export interface OrderQuote {
  lines: { label: string; quantity: number; unit: Paise; line: Paise }[];
  decor: { id: string; name: string; price: Paise }[];
  totalBoxes: number;
  tier: Tier;
  boxSubtotal: Paise;
  discount: Paise;
  decorSubtotal: Paise;
  expressFee: Paise;
  tax: Paise;
  subtotal: Paise;
  total: Paise;
  /** Advance for the DEPOSIT plan, rounded up to a whole rupee. */
  deposit: Paise;
}

/**
 * Prices a whole cart. Bulk tiers apply across all box lines combined, so two
 * designs of 15 boxes each earn the 25+ tier. Runs identically on client and
 * server; the server result is the only one ever charged.
 */
export function quoteOrder(cart: CartInput): OrderQuote {
  const lines = cart.lines.map((l) => {
    const unit = unitPrice(l.spec);
    return { label: l.label, quantity: l.quantity, unit, line: unit * l.quantity };
  });
  const totalBoxes = lines.reduce((s, l) => s + l.quantity, 0);
  const boxSubtotal = lines.reduce((s, l) => s + l.line, 0);
  const { current: tier } = tierFor(totalBoxes);
  const discount = pct(boxSubtotal, tier.rate);

  const decor = cart.decor.flatMap((id) => {
    const kit = DECOR_BY_ID.get(id);
    return kit ? [{ id: kit.id, name: kit.name, price: kit.price }] : [];
  });
  const decorSubtotal = decor.reduce((s, d) => s + d.price, 0);
  const expressFee = cart.express ? EXPRESS_FEE : 0;

  const tax = pct(boxSubtotal - discount, FOOD_GST) + pct(decorSubtotal + expressFee, SERVICE_GST);
  const subtotal = boxSubtotal + decorSubtotal + expressFee;
  const total = subtotal - discount + tax;
  const deposit = Math.ceil((total * DEPOSIT_RATE) / 100) * 100;

  return { lines, decor, totalBoxes, tier, boxSubtotal, discount, decorSubtotal, expressFee, tax, subtotal, total, deposit };
}
