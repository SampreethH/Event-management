import { describe, expect, it } from "vitest";
import { planParty } from "./party-calculator";

describe("party calculator", () => {
  it("adds a small buffer and spends less than the typical over-order", () => {
    const plan = planParty({ kids: 20, teens: 0, adults: 10, theme: "Superhero", hours: 3, withDecor: false });
    expect(plan.guests).toBe(30);
    expect(plan.boxes).toBe(32);
    expect(plan.dominant).toBe("kids");
    expect(plan.estimate.saved).toBeGreaterThan(0);
  });

  it("scales decor with the crowd and honours a neon theme", () => {
    expect(planParty({ kids: 0, teens: 0, adults: 10, theme: "Boho brunch", hours: 2, withDecor: true }).decor.map((d) => d.id)).toEqual(["boho-tabletop"]);
    expect(planParty({ kids: 0, teens: 0, adults: 10, theme: "Neon night", hours: 2, withDecor: true }).decor.map((d) => d.id)).toContain("neon-backdrop");
    expect(planParty({ kids: 30, teens: 20, adults: 10, theme: "Classic gold", hours: 4, withDecor: true }).decor).toHaveLength(2);
  });

  it("teens need more snacks than the same number of kids", () => {
    const kids = planParty({ kids: 20, teens: 0, adults: 0, theme: "Superhero", hours: 3, withDecor: false });
    const teens = planParty({ kids: 0, teens: 20, adults: 0, theme: "Superhero", hours: 3, withDecor: false });
    expect(teens.snackKg).toBeGreaterThan(kids.snackKg);
  });

  it("handles an empty guest list", () => {
    const plan = planParty({ kids: 0, teens: 0, adults: 0, theme: "Superhero", hours: 3, withDecor: true });
    expect(plan.boxes).toBe(0);
    expect(plan.estimate.total).toBe(0);
  });
});
