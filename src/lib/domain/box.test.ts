import { describe, expect, it } from "vitest";
import { boxSpecSchema, dietaryBadges, quoteBox, tierFor, unitPrice, type BoxSpec } from "./box";
import { PACKAGING_FEE } from "./catalog";

const spec: BoxSpec = {
  sleeveId: "sleeve-coral-pop",
  ribbonId: "ribbon-gold-satin",
  ribbonText: "Aanya turns 7 ★",
  items: { "snack-masala-makhana": 1, "cake-red-velvet": 1 },
};

describe("box spec validation", () => {
  it("accepts a valid box", () => {
    expect(boxSpecSchema.safeParse(spec).success).toBe(true);
  });
  it("rejects unknown items, wrong categories and over-filled slots", () => {
    expect(boxSpecSchema.safeParse({ ...spec, items: { nope: 1 } }).success).toBe(false);
    expect(boxSpecSchema.safeParse({ ...spec, sleeveId: "snack-trail-mix" }).success).toBe(false);
    expect(boxSpecSchema.safeParse({ ...spec, items: { ...spec.items, "cake-belgian-chocolate": 1 } }).success).toBe(false);
  });
  it("requires at least one snack", () => {
    expect(boxSpecSchema.safeParse({ ...spec, items: { "cake-red-velvet": 1 } }).success).toBe(false);
  });
  it("rejects markup in ribbon text", () => {
    expect(boxSpecSchema.safeParse({ ...spec, ribbonText: "<script>" }).success).toBe(false);
  });
});

describe("pricing", () => {
  it("sums packaging, sleeve, ribbon and contents", () => {
    expect(unitPrice(spec)).toBe(PACKAGING_FEE + 2000 + 0 + 6000 + 9000);
  });
  it("applies bulk tiers at the boundaries", () => {
    expect(tierFor(9).current.rate).toBe(0);
    expect(tierFor(10).current.rate).toBe(0.05);
    expect(tierFor(100).current.rate).toBe(0.2);
    expect(tierFor(100).next).toBeUndefined();
  });
  it("computes discount before GST and reports distance to next tier", () => {
    const q = quoteBox(spec, 20);
    expect(q.subtotal).toBe(unitPrice(spec) * 20);
    expect(q.discount).toBe(Math.round(q.subtotal * 0.05));
    expect(q.tax).toBe(Math.round((q.subtotal - q.discount) * 0.05));
    expect(q.total).toBe(q.subtotal - q.discount + q.tax);
    expect(q.nextTier?.boxesAway).toBe(5);
  });
});

describe("dietary badges", () => {
  it("is only vegan when every edible is vegan", () => {
    expect(dietaryBadges({ items: { "snack-masala-makhana": 1 } }).vegan).toBe(true);
    expect(dietaryBadges(spec).vegan).toBe(false);
  });
  it("raises the nut alert from any nut item", () => {
    const b = dietaryBadges({ items: { "snack-masala-makhana": 1, "conf-kaju-katli": 1 } });
    expect(b.containsNuts).toBe(true);
    expect(b.nutSources).toEqual(["Silver-leaf kaju katli tin"]);
  });
  it("ignores non-edible favors", () => {
    expect(dietaryBadges({ items: { "snack-masala-makhana": 1, "favor-tote": 1 } }).glutenFree).toBe(true);
  });
});
