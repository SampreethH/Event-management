import { describe, expect, it } from "vitest";
import { boxSpecSchema, dietaryBadges, quoteBox, tierFor, unitPrice, type BoxSpec } from "./box";
import { PACKAGING_FEE, boxKindOf } from "./catalog";

const spec: BoxSpec = {
  sleeveId: "sleeve-red",
  ribbonId: "ribbon-gold-satin",
  ribbonText: "Aanya turns 7 ★",
  items: { "snack-salted-chips": 1, "cake-plain-vanilla": 1 },
};

describe("box spec validation", () => {
  it("accepts a valid box", () => {
    expect(boxSpecSchema.safeParse(spec).success).toBe(true);
  });
  it("rejects unknown items, wrong categories and over-filled slots", () => {
    expect(boxSpecSchema.safeParse({ ...spec, items: { nope: 1 } }).success).toBe(false);
    expect(boxSpecSchema.safeParse({ ...spec, sleeveId: "snack-khara-mixture" }).success).toBe(false);
    expect(boxSpecSchema.safeParse({ ...spec, items: { ...spec.items, "cake-honey": 1 } }).success).toBe(false);
  });
  it("requires at least one snack in a snack box", () => {
    expect(boxSpecSchema.safeParse({ ...spec, items: { "cake-plain-vanilla": 1 } }).success).toBe(false);
  });
  it("accepts a gifts-only return-gift box and caps it at 3 gifts", () => {
    const gift = { ...spec, items: { "favor-channapatna-toy": 1, "favor-stationery-kit": 1 } };
    expect(boxKindOf(gift.items)).toBe("gift");
    expect(boxSpecSchema.safeParse(gift).success).toBe(true);
    const tooMany = { ...gift.items, "favor-jute-bag": 1, "favor-seed-pencils": 1 };
    expect(boxSpecSchema.safeParse({ ...spec, items: tooMany }).success).toBe(false);
  });
  it("treats any edible as a snack box, so food still needs a snack", () => {
    expect(boxKindOf({ "favor-jute-bag": 1, "conf-jalebi": 1 })).toBe("snack");
    expect(boxSpecSchema.safeParse({ ...spec, items: { "favor-jute-bag": 1, "conf-jalebi": 1 } }).success).toBe(false);
  });
  it("rejects an empty box", () => {
    expect(boxSpecSchema.safeParse({ ...spec, items: {} }).success).toBe(false);
  });
  it("rejects markup in ribbon text", () => {
    expect(boxSpecSchema.safeParse({ ...spec, ribbonText: "<script>" }).success).toBe(false);
  });
});

describe("pricing", () => {
  it("sums packaging, sleeve, ribbon and contents", () => {
    expect(unitPrice(spec)).toBe(PACKAGING_FEE + 500 + 0 + 1500 + 2500);
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
    expect(dietaryBadges({ items: { "snack-salted-chips": 1 } }).vegan).toBe(true);
    expect(dietaryBadges(spec).vegan).toBe(false);
  });
  it("raises the nut alert from any nut item", () => {
    const b = dietaryBadges({ items: { "snack-salted-chips": 1, "conf-kaju-katli": 1 } });
    expect(b.containsNuts).toBe(true);
    expect(b.nutSources).toEqual(["Kaju katli"]);
  });
  it("ignores non-edible favors", () => {
    expect(dietaryBadges({ items: { "snack-salted-chips": 1, "favor-jute-bag": 1 } }).glutenFree).toBe(true);
  });
});
