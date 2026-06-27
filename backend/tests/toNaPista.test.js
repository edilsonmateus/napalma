import { describe, expect, it } from "vitest";
import { calculateDistanceKm } from "../src/services/toNaPista.service.js";

describe("Tô na Pista distance", () => {
  it("returns zero for the same point", () => {
    expect(calculateDistanceKm(-23.55, -46.63, -23.55, -46.63)).toBe(0);
  });

  it("calculates a plausible distance between nearby points", () => {
    const distance = calculateDistanceKm(-23.5505, -46.6333, -23.5614, -46.6559);
    expect(distance).toBeGreaterThan(2);
    expect(distance).toBeLessThan(4);
  });
});
