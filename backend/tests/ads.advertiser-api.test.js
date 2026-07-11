import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  advertiserAccount: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  advertiserMembership: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn()
  },
  adCampaign: {
    findUnique: vi.fn(),
    update: vi.fn()
  },
  user: {
    findUnique: vi.fn()
  },
  auditLog: {
    create: vi.fn()
  },
  $transaction: vi.fn()
}));

vi.mock("../src/lib/prisma.js", () => ({ prisma: prismaMock }));

import {
  approveAdvertiserAccessRequest,
  createAdvertiserAccount,
  createAdvertiserMembership,
  listAdvertiserAccounts,
  rejectAdvertiserAccessRequest,
  revokeAdvertiserMembership,
  setCampaignAdvertiserAccount
} from "../src/controllers/advertiserAccounts.controller.js";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const CAMPAIGN_ID = "33333333-3333-4333-8333-333333333333";
const MEMBERSHIP_ID = "44444444-4444-4444-8444-444444444444";

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

function account(overrides = {}) {
  return {
    id: ACCOUNT_ID,
    name: "Casa Exemplo",
    type: "venue",
    status: "draft",
    source: "manual",
    legalName: null,
    documentNumber: "00.000.000/0001-00",
    contactEmail: "contato@example.com",
    contactPhone: null,
    notes: null,
    approvedAt: null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
});

describe("Ads advertiser accounts admin API", () => {
  it("lists accounts without exposing document number", async () => {
    prismaMock.advertiserAccount.findMany.mockResolvedValue([
      account({ _count: { campaigns: 2, memberships: 1 } })
    ]);
    const res = response();
    await listAdvertiserAccounts({ query: {} }, res, vi.fn());

    const payload = res.json.mock.calls[0][0];
    expect(payload.items[0].documentNumber).toBeUndefined();
    expect(payload.items[0].counts).toEqual({ campaigns: 2, memberships: 1 });
  });

  it("creates a manual draft account owned by the requesting admin", async () => {
    prismaMock.advertiserAccount.create.mockResolvedValue(account());
    const res = response();
    await createAdvertiserAccount(
      { body: { name: "Casa Exemplo", type: "venue" }, user: { id: USER_ID } },
      res,
      vi.fn()
    );

    expect(prismaMock.advertiserAccount.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Casa Exemplo",
        type: "venue",
        status: "draft",
        source: "manual",
        createdByUserId: USER_ID
      })
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns conflict instead of duplicating a membership", async () => {
    prismaMock.advertiserAccount.findUnique.mockResolvedValue(account());
    prismaMock.user.findUnique.mockResolvedValue({ id: USER_ID });
    prismaMock.advertiserMembership.findUnique.mockResolvedValue({ id: MEMBERSHIP_ID });
    const res = response();
    await createAdvertiserMembership(
      {
        params: { accountId: ACCOUNT_ID },
        body: { userId: USER_ID, role: "analyst" },
        user: { id: USER_ID }
      },
      res,
      vi.fn()
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(prismaMock.advertiserMembership.create).not.toHaveBeenCalled();
  });

  it("resolves a membership by exact email without listing users", async () => {
    prismaMock.advertiserAccount.findUnique.mockResolvedValue(account());
    prismaMock.user.findUnique.mockResolvedValue({ id: USER_ID });
    prismaMock.advertiserMembership.findUnique.mockResolvedValue(null);
    prismaMock.advertiserMembership.create.mockResolvedValue({ id: MEMBERSHIP_ID });
    const res = response();

    await createAdvertiserMembership(
      {
        params: { accountId: ACCOUNT_ID },
        body: { email: "MEMBRO@EXAMPLE.COM", role: "campaign_manager", status: "active" },
        user: { id: USER_ID }
      },
      res,
      vi.fn()
    );

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "membro@example.com" },
      select: { id: true }
    });
    expect(prismaMock.advertiserMembership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: ACCOUNT_ID,
        userId: USER_ID,
        role: "campaign_manager",
        status: "active"
      })
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("revokes a membership without deleting it or its user", async () => {
    prismaMock.advertiserMembership.findUnique.mockResolvedValue({ id: MEMBERSHIP_ID });
    prismaMock.advertiserMembership.update.mockResolvedValue({
      id: MEMBERSHIP_ID,
      status: "revoked"
    });
    const res = response();
    await revokeAdvertiserMembership(
      { params: { id: MEMBERSHIP_ID } },
      res,
      vi.fn()
    );

    expect(prismaMock.advertiserMembership.update).toHaveBeenCalledWith({
      where: { id: MEMBERSHIP_ID },
      data: { status: "revoked" }
    });
    expect(prismaMock.user).not.toHaveProperty("delete");
  });

  it("links only the optional account foreign key and preserves legacy advertiser", async () => {
    prismaMock.adCampaign.findUnique.mockResolvedValue({ id: CAMPAIGN_ID });
    prismaMock.advertiserAccount.findUnique.mockResolvedValue({
      id: ACCOUNT_ID,
      status: "active"
    });
    prismaMock.adCampaign.update.mockResolvedValue({
      id: CAMPAIGN_ID,
      name: "Campanha",
      advertiser: "Texto legado",
      advertiserAccountId: ACCOUNT_ID
    });
    const res = response();
    await setCampaignAdvertiserAccount(
      { params: { id: CAMPAIGN_ID }, body: { accountId: ACCOUNT_ID } },
      res,
      vi.fn()
    );

    expect(prismaMock.adCampaign.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { advertiserAccountId: ACCOUNT_ID } })
    );
    expect(prismaMock.adCampaign.update.mock.calls[0][0].data).not.toHaveProperty("advertiser");
  });

  it("does not link campaigns to archived accounts", async () => {
    prismaMock.adCampaign.findUnique.mockResolvedValue({ id: CAMPAIGN_ID });
    prismaMock.advertiserAccount.findUnique.mockResolvedValue({
      id: ACCOUNT_ID,
      status: "archived"
    });
    const res = response();
    await setCampaignAdvertiserAccount(
      { params: { id: CAMPAIGN_ID }, body: { accountId: ACCOUNT_ID } },
      res,
      vi.fn()
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(prismaMock.adCampaign.update).not.toHaveBeenCalled();
  });

  it("approves a self-service advertiser request and activates invited memberships", async () => {
    prismaMock.advertiserAccount.findUnique.mockResolvedValue(account({
      status: "pending_review",
      source: "self_service_request",
      memberships: [{ id: MEMBERSHIP_ID, status: "invited" }]
    }));
    prismaMock.advertiserMembership.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.advertiserAccount.update.mockResolvedValue(account({
      status: "active",
      source: "self_service_request",
      approvedByUserId: USER_ID,
      memberships: [{ id: MEMBERSHIP_ID, status: "active" }],
      campaigns: []
    }));
    const res = response();

    await approveAdvertiserAccessRequest(
      { params: { id: ACCOUNT_ID }, user: { id: USER_ID } },
      res,
      vi.fn()
    );

    expect(prismaMock.advertiserMembership.updateMany).toHaveBeenCalledWith({
      where: { accountId: ACCOUNT_ID, status: "invited" },
      data: { status: "active", acceptedAt: expect.any(Date) }
    });
    expect(prismaMock.advertiserAccount.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: ACCOUNT_ID },
      data: expect.objectContaining({
        status: "active",
        approvedByUserId: USER_ID,
        approvedAt: expect.any(Date)
      })
    }));
  });

  it("rejects a pending advertiser request and revokes pending memberships", async () => {
    prismaMock.advertiserAccount.findUnique.mockResolvedValue(account({
      status: "pending_review",
      source: "self_service_request"
    }));
    prismaMock.advertiserMembership.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.advertiserAccount.update.mockResolvedValue(account({
      status: "rejected",
      source: "self_service_request",
      memberships: [{ id: MEMBERSHIP_ID, status: "revoked" }],
      campaigns: []
    }));
    const res = response();

    await rejectAdvertiserAccessRequest(
      { params: { id: ACCOUNT_ID }, body: { reason: "fora de escopo" }, user: { id: USER_ID } },
      res,
      vi.fn()
    );

    expect(prismaMock.advertiserMembership.updateMany).toHaveBeenCalledWith({
      where: { accountId: ACCOUNT_ID, status: { in: ["invited", "suspended"] } },
      data: { status: "revoked" }
    });
    expect(prismaMock.advertiserAccount.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: ACCOUNT_ID },
      data: expect.objectContaining({
        status: "rejected",
        notes: expect.stringContaining("fora de escopo")
      })
    }));
  });
});
