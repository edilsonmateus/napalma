import { describe, expect, it } from "vitest";
import { missingAcquisitionVenueFields, pendingAcquisitionConversions } from "../../frontend/src/utils/acquisitionConversion.js";

describe("Acquisition conversion eligibility", () => {
  it("identifies missing catalog data, including whitespace", () => {
    expect(missingAcquisitionVenueFields({ address: "  ", neighborhood: "Centro", city: "São Paulo" })).toEqual(["endereço", "região"]);
    expect(missingAcquisitionVenueFields({ address: "Rua A", neighborhood: "Centro", region: "Centro", city: "São Paulo" })).toEqual([]);
  });
  it("keeps every pending closed opportunity, excluding already converted houses", () => {
    const pending = Array.from({ length: 8 }, (_, id) => ({ id, status: "closed" }));
    const leads = [{ id: "converted", status: "closed", convertedVenueId: "venue" }, { id: "mapped", status: "mapped" }, ...pending];
    expect(pendingAcquisitionConversions(leads)).toEqual(pending);
  });
});
