import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  adCampaign: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  adCreative: {
    create: vi.fn(),
    update: vi.fn()
  },
  adEventLog: {
    create: vi.fn(),
    groupBy: vi.fn(),
    findMany: vi.fn()
  },
  venue: {
    findMany: vi.fn()
  }
}));

vi.mock("../src/lib/prisma.js", () => ({ prisma: prismaMock }));

import {
  getAdDelivery,
  listAdCampaigns,
  trackAdClick,
  trackAdImpression
} from "../src/controllers/ads.controller.js";

const CAMPAIGN_ID = "11111111-1111-4111-8111-111111111111";
const CREATIVE_ID = "22222222-2222-4222-8222-222222222222";
const VENUE_ID = "33333333-3333-4333-8333-333333333333";

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
}

function activeCampaign(overrides = {}) {
  return {
    id: CAMPAIGN_ID,
    name: "Campanha Centro",
    advertiser: "Casa Exemplo",
    status: "active",
    startsAt: null,
    endsAt: null,
    priority: 5,
    frequencyCapDaily: 3,
    runInAllSlots: false,
    isEnabled: true,
    targeting: null,
    createdAt: new Date("2026-06-01T12:00:00.000Z"),
    updatedAt: new Date("2026-06-01T12:00:00.000Z"),
    creatives: [
      {
        id: CREATIVE_ID,
        slot: "explore_feed_large",
        title: "Hoje tem samba",
        imageUrl: "https://cdn.example.com/ad.webp",
        destinationUrl: "https://77gira.com.br/events/example",
        altText: "Campanha Centro",
        width: 1600,
        height: 600,
        isEnabled: true
      }
    ],
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Ads controller legacy contracts", () => {
  it("returns the current no-fill contract when no campaign is eligible", async () => {
    prismaMock.adCampaign.findMany.mockResolvedValue([]);
    const req = { params: { slot: "explore_feed_large" }, user: null };
    const res = createResponse();
    const next = vi.fn();

    await getAdDelivery(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ item: null });
  });

  it("preserves the public delivery payload for an eligible campaign", async () => {
    prismaMock.adCampaign.findMany.mockResolvedValue([activeCampaign()]);
    const req = { params: { slot: "explore_feed_large" }, user: null };
    const res = createResponse();
    const next = vi.fn();

    await getAdDelivery(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      item: {
        campaignId: CAMPAIGN_ID,
        campaignName: "Campanha Centro",
        slot: "explore_feed_large",
        creativeId: CREATIVE_ID,
        imageUrl: "https://cdn.example.com/ad.webp",
        destinationUrl: "https://77gira.com.br/events/example",
        altText: "Campanha Centro",
        title: "Hoje tem samba"
      }
    });
  });

  it("returns no-fill when an authenticated user reached the daily frequency cap", async () => {
    prismaMock.adCampaign.findMany.mockResolvedValue([activeCampaign()]);
    prismaMock.adEventLog.groupBy.mockResolvedValue([
      { campaignId: CAMPAIGN_ID, _count: { _all: 3 } }
    ]);
    const req = {
      params: { slot: "explore_feed_large" },
      user: { id: "user-1", role: "attendee" }
    };
    const res = createResponse();
    const next = vi.fn();

    await getAdDelivery(req, res, next);

    expect(prismaMock.adEventLog.groupBy).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith({ item: null });
    expect(next).not.toHaveBeenCalled();
  });

  it("keeps the campaign list envelope and mapped creative fields", async () => {
    prismaMock.adCampaign.findMany.mockResolvedValue([
      activeCampaign({
        advertiserAccountId: "44444444-4444-4444-8444-444444444444",
        advertiserAccount: { id: "44444444-4444-4444-8444-444444444444", name: "Conta Casa", status: "active" }
      })
    ]);
    const res = createResponse();
    const next = vi.fn();

    await listAdCampaigns({}, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      items: [
        expect.objectContaining({
          id: CAMPAIGN_ID,
          advertiser: "Casa Exemplo",
          advertiserAccountId: "44444444-4444-4444-8444-444444444444",
          advertiserAccount: expect.objectContaining({ name: "Conta Casa" }),
          name: "Campanha Centro",
          status: "active",
          creatives: [
            expect.objectContaining({
              id: CREATIVE_ID,
              slot: "explore_feed_large",
              imageUrl: "https://cdn.example.com/ad.webp"
            })
          ]
        })
      ]
    });
  });

  it.each([
    ["impression", trackAdImpression],
    ["click", trackAdClick]
  ])("persists the current %s tracking payload", async (type, handler) => {
    prismaMock.adEventLog.create.mockResolvedValue({ id: "log-1" });
    const req = {
      body: {
        campaignId: CAMPAIGN_ID,
        creativeId: CREATIVE_ID,
        slot: "venue_detail_inline",
        venueId: VENUE_ID,
        sessionId: "session-77"
      },
      user: { id: "user-1" },
      headers: { "user-agent": "Vitest Browser" }
    };
    const res = createResponse();
    const next = vi.fn();

    await handler(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(prismaMock.adEventLog.create).toHaveBeenCalledWith({
      data: {
        type,
        campaignId: CAMPAIGN_ID,
        creativeId: CREATIVE_ID,
        slot: "venue_detail_inline",
        venueId: VENUE_ID,
        userId: "user-1",
        sessionId: "session-77",
        userAgent: "Vitest Browser"
      }
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("rejects an invalid tracking payload before writing to the database", async () => {
    const req = {
      body: {
        campaignId: "invalid-id",
        creativeId: CREATIVE_ID,
        slot: "explore_feed_large"
      },
      user: null,
      headers: {}
    };
    const res = createResponse();
    const next = vi.fn();

    await trackAdImpression(req, res, next);

    expect(prismaMock.adEventLog.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});
