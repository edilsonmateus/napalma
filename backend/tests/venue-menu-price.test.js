import { describe, expect, it } from "vitest";
import {
  normalizeVenueMenuPriceInput,
  parseVenueMenuPriceToCents,
  venueMenuPriceError
} from "../../frontend/src/utils/venueMenuPrice.js";

describe("Venue Menu price input", () => {
  it.each([
    ["29,00", 2900],
    ["29.00", 2900],
    ["R$ 29,00", 2900],
    ["R$\u00a029,00", 2900],
    ["1.234,56", 123456],
    ["1,234.56", 123456],
    ["0", 0]
  ])("parses %s without losing cents", (input, expected) => {
    expect(parseVenueMenuPriceToCents(input)).toBe(expected);
  });

  it("distinguishes an empty value from malformed input", () => {
    expect(parseVenueMenuPriceToCents("")).toBeNull();
    expect(Number.isNaN(parseVenueMenuPriceToCents("vinte e nove"))).toBe(true);
    expect(Number.isNaN(parseVenueMenuPriceToCents("R$ -29,00"))).toBe(true);
  });

  it("requires a valid price only for exact and starting-at modes", () => {
    expect(venueMenuPriceError("", "exact")).toContain("Informe o preço");
    expect(venueMenuPriceError("texto", "from")).toContain("Digite somente");
    expect(venueMenuPriceError("", "hidden")).toBe("");
    expect(venueMenuPriceError("", "consultation")).toBe("");
  });

  it("preserves simple integer prices and keeps cents only when needed", () => {
    expect(normalizeVenueMenuPriceInput("29")).toBe("29");
    expect(normalizeVenueMenuPriceInput("129,00")).toBe("129");
    expect(normalizeVenueMenuPriceInput("R$ 29,00")).toBe("29");
    expect(normalizeVenueMenuPriceInput("29,50")).toBe("29,50");
  });
});
