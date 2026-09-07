import { describe, expect, it, vi } from "vitest";
import {
  resolveVenueInclusion,
  venueInclusionIdentity,
  venueInclusionRequestedChangesSchema
} from "./venueInclusion.service.js";

describe("venue inclusion request", () => {
  it("normalizes identity without confusing distinct cities", () => {
    const first = venueInclusionIdentity({ venueName: "  Casa do Ó  ", city: "São Paulo", state: "sp" });
    const same = venueInclusionIdentity({ venueName: "casa do o", city: "sao   paulo", state: "SP" });
    const otherCity = venueInclusionIdentity({ venueName: "Casa do Ó", city: "Campinas", state: "SP" });

    expect(first).toBe(same);
    expect(first).not.toBe(otherCity);
  });

  it("requires the minimum catalogue data and normalizes the UF", () => {
    const parsed = venueInclusionRequestedChangesSchema.parse({
      venueName: "Casa Exemplo",
      address: "Rua Exemplo, 10",
      neighborhood: "Centro",
      region: "Centro",
      city: "São Paulo",
      state: "sp",
      requestedAccessProfile: "venue_manager"
    });

    expect(parsed.state).toBe("SP");
    expect(parsed.requestedAccessProfile).toBe("venue_manager");
  });

  it("rejects an incomplete request before it reaches Operations", () => {
    const parsed = venueInclusionRequestedChangesSchema.safeParse({ venueName: "Casa" });
    expect(parsed.success).toBe(false);
  });

  it("links an existing venue without creating or publishing another one", async () => {
    const tx = {
      venue: {
        findUnique: vi.fn().mockResolvedValue({ id: "venue-1", name: "Casa Existente", visibilityStatus: "published" }),
        create: vi.fn()
      }
    };

    const result = await resolveVenueInclusion({
      tx,
      claim: { id: "claim-1" },
      resolution: { mode: "existing", venueId: "venue-1" },
      actorUserId: "admin-1"
    });

    expect(result).toEqual({ venueId: "venue-1", mode: "existing", venueCreated: false });
    expect(tx.venue.create).not.toHaveBeenCalled();
  });

  it("creates a new venue as a private draft", async () => {
    const tx = {
      venue: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "venue-2", name: "Casa Nova", visibilityStatus: "draft" })
      }
    };
    const claim = {
      id: "12345678-aaaa-bbbb-cccc-123456789012",
      responsibleName: "Responsável",
      responsiblePhone: "11999999999",
      requestedChanges: {
        venueName: "Casa Nova",
        address: "Rua Nova, 10",
        neighborhood: "Centro",
        region: "Centro",
        city: "São Paulo",
        state: "SP",
        requestedAccessProfile: "venue_manager"
      }
    };

    const result = await resolveVenueInclusion({ tx, claim, resolution: { mode: "create_draft" }, actorUserId: "admin-1" });

    expect(result).toEqual({ venueId: "venue-2", mode: "create_draft", venueCreated: true });
    expect(tx.venue.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ visibilityStatus: "draft" })
    }));
    expect(tx.venue.create.mock.calls[0][0].data).not.toHaveProperty("managerUserId");
  });
});
