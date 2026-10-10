import { describe, expect, it } from "vitest";
import { boxSpecSchema } from "./box";
import { CATALOG, CATALOG_BY_ID } from "./catalog";
import { STARTER_SPECS } from "./party-calculator";
import { SOS_KITS } from "./sos";

describe("catalog presets", () => {
  it("has unique ids", () => {
    expect(CATALOG_BY_ID.size).toBe(CATALOG.length);
  });
  it("keeps every starter recipe and SOS kit valid", () => {
    for (const spec of [...Object.values(STARTER_SPECS), ...SOS_KITS.map((k) => k.spec)]) {
      expect(boxSpecSchema.safeParse(spec).success).toBe(true);
    }
  });
  it("only puts express-eligible items in SOS kits", () => {
    for (const kit of SOS_KITS) {
      for (const id of Object.keys(kit.spec.items)) expect(CATALOG_BY_ID.get(id)?.express, id).toBe(true);
    }
  });
});
