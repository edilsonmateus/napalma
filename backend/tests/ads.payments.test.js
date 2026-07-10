import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  advertiserMembership: { findFirst: vi.fn() },
  adCampaign: { findFirst: vi.fn(), update: vi.fn() },
  adPaymentOrder: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  advertiserWallet: { upsert: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
  adCreditLedgerEntry: { create: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(async (callback) => callback(prismaMock))
}));

vi.mock("../src/lib/prisma.js", () => ({ prisma: prismaMock }));

import {
  allocateWalletCreditsToCampaign,
  createMockPaymentOrder,
  paymentRuntime,
  processMockPaymentOrder,
  sanitizePaymentReturnPath
} from "../src/services/adPayments.service.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const CAMPAIGN_ID = "33333333-3333-4333-8333-333333333333";
const ORDER_ID = "44444444-4444-4444-8444-444444444444";

function order(overrides = {}) {
  return {
    id: ORDER_ID,
    accountId: ACCOUNT_ID,
    campaignId: CAMPAIGN_ID,
    provider: "mock",
    status: "created",
    packageCode: "test_controlled",
    creditAmount: 100,
    amountCents: 4900,
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADS_CREDITS_PURCHASE_ENABLED = "true";
  process.env.ADS_PAYMENT_PROVIDER = "mock";
  process.env.ADS_MOCK_PAYMENT_ENABLED = "true";
  prismaMock.advertiserMembership.findFirst.mockResolvedValue({ role: "owner", account: { id: ACCOUNT_ID, status: "active" } });
});

describe("Ads mock payments", () => {
  it("requires all three explicit runtime switches", () => {
    expect(paymentRuntime().available).toBe(true);
    process.env.ADS_MOCK_PAYMENT_ENABLED = "false";
    expect(paymentRuntime().available).toBe(false);
  });

  it("only accepts a local advertiser workspace return path", () => {
    expect(sanitizePaymentReturnPath("/workspace/anunciante?accountId=abc")).toContain("/workspace/anunciante");
    expect(sanitizePaymentReturnPath("https://malicious.example")).toBe("/workspace/anunciante");
    expect(sanitizePaymentReturnPath("//malicious.example")).toBe("/workspace/anunciante");
  });

  it("blocks payment creation for non billing roles", async () => {
    prismaMock.advertiserMembership.findFirst.mockResolvedValue({ role: "viewer", account: { id: ACCOUNT_ID, status: "active" } });
    const result = await createMockPaymentOrder({ accountId: ACCOUNT_ID, packageCode: "test_controlled", userId: USER_ID });
    expect(result.error).toBe("advertiser_billing_denied");
    expect(prismaMock.adPaymentOrder.create).not.toHaveBeenCalled();
  });

  it("credits once and automatically allocates a directed purchase", async () => {
    prismaMock.adPaymentOrder.findUnique.mockResolvedValue(order({ status: "approved" }));
    prismaMock.adPaymentOrder.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.advertiserWallet.upsert.mockResolvedValue({ balance: 0 });
    prismaMock.advertiserWallet.update
      .mockResolvedValueOnce({ balance: 100 })
      .mockResolvedValueOnce({ balance: 0 });
    prismaMock.adCreditLedgerEntry.create.mockResolvedValue({});
    prismaMock.adCampaign.update.mockResolvedValue({ budgetCredits: 100 });

    const result = await processMockPaymentOrder({ orderId: ORDER_ID, outcome: "approved", userId: USER_ID });

    expect(result.item.status).toBe("approved");
    expect(prismaMock.adCreditLedgerEntry.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.adCampaign.update).toHaveBeenCalledWith({
      where: { id: CAMPAIGN_ID },
      data: { budgetCredits: { increment: 100 } }
    });
  });

  it("does not credit an order already claimed by another webhook", async () => {
    prismaMock.adPaymentOrder.findUnique.mockResolvedValue(order({ status: "approved" }));
    prismaMock.adPaymentOrder.updateMany.mockResolvedValue({ count: 0 });

    await processMockPaymentOrder({ orderId: ORDER_ID, outcome: "approved", userId: USER_ID });

    expect(prismaMock.adCreditLedgerEntry.create).not.toHaveBeenCalled();
    expect(prismaMock.advertiserWallet.update).not.toHaveBeenCalled();
  });

  it("atomically moves available wallet credits into the selected campaign", async () => {
    prismaMock.adCampaign.findFirst.mockResolvedValue({ id: CAMPAIGN_ID, advertiserAccountId: ACCOUNT_ID });
    prismaMock.advertiserWallet.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.advertiserWallet.findUnique.mockResolvedValue({ balance: 0 });
    prismaMock.adCampaign.update.mockResolvedValue({ id: CAMPAIGN_ID, budgetCredits: 100 });
    prismaMock.adCreditLedgerEntry.create.mockResolvedValue({});

    const result = await allocateWalletCreditsToCampaign({ accountId: ACCOUNT_ID, campaignId: CAMPAIGN_ID, amount: 100, userId: USER_ID });

    expect(result.item.budgetCredits).toBe(100);
    expect(prismaMock.advertiserWallet.updateMany).toHaveBeenCalledWith({
      where: { accountId: ACCOUNT_ID, balance: { gte: 100 } },
      data: { balance: { decrement: 100 } }
    });
    expect(prismaMock.adCampaign.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: CAMPAIGN_ID }, data: { budgetCredits: { increment: 100 } }
    }));
  });
});
