/** All money is integer minor units (paise). Never use floats for totals. */
export type Paise = number;

export const CURRENCY = "INR" as const;

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

export function formatPaise(value: Paise): string {
  return inr.format(Math.round(value) / 100);
}

/** Percentage of an amount, rounded half-up to the nearest paisa. */
export function pct(value: Paise, rate: number): Paise {
  return Math.round(value * rate);
}
