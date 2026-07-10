import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { isFeatureEnabled } from "../middlewares/featureFlags.js";

export const AD_CREDIT_PACKAGES = Object.freeze({
  test_controlled: { code: "test_controlled", name: "Teste controlado", credits: 100, amountCents: 4900 },
  local_boost: { code: "local_boost", name: "Impulso local", credits: 300, amountCents: 12900 },
  presence_campaign: { code: "presence_campaign", name: "Campanha de presenca", credits: 750, amountCents: 27900 }
});

export const BILLING_ROLES = ["owner", "admin", "billing_manager"];

export function paymentRuntime() {
  const provider = String(process.env.ADS_PAYMENT_PROVIDER || "disabled").trim().toLowerCase();
  const creditsEnabled = isFeatureEnabled("ADS_CREDITS_PURCHASE_ENABLED");
  const mockEnabled = isFeatureEnabled("ADS_MOCK_PAYMENT_ENABLED");
  return {
    provider,
    creditsEnabled,
    mockEnabled,
    available: creditsEnabled && provider === "mock" && mockEnabled,
    isSimulation: provider === "mock"
  };
}

export function sanitizePaymentReturnPath(value) {
  const path = String(value || "/workspace/anunciante").trim();
  if (!path.startsWith("/workspace/anunciante") || path.startsWith("//") || path.includes("://")) {
    return "/workspace/anunciante";
  }
  return path.slice(0, 500);
}

export async function getActiveAdvertiserMembership(userId, accountId) {
  return prisma.advertiserMembership.findFirst({
    where: {
      userId,
      accountId,
      status: "active",
      account: { status: "active" }
    },
    include: { account: true }
  });
}

export async function createMockPaymentOrder({ accountId, campaignId, packageCode, returnPath, userId }) {
  const runtime = paymentRuntime();
  if (!runtime.available) {
    return { error: "mock_payment_not_available", status: 404, message: "A simulacao de compra de patacos nao esta habilitada." };
  }
  const selectedPackage = AD_CREDIT_PACKAGES[packageCode];
  if (!selectedPackage) {
    return { error: "credit_package_not_found", status: 400, message: "Pacote de patacos invalido." };
  }

  const membership = await getActiveAdvertiserMembership(userId, accountId);
  if (!membership) return { error: "advertiser_access_denied", status: 403, message: "Sem acesso a esta conta anunciante." };
  if (!BILLING_ROLES.includes(membership.role)) {
    return { error: "advertiser_billing_denied", status: 403, message: "Seu papel nao permite adquirir patacos para esta conta." };
  }

  if (campaignId) {
    const campaign = await prisma.adCampaign.findFirst({ where: { id: campaignId, advertiserAccountId: accountId } });
    if (!campaign) return { error: "campaign_not_found", status: 404, message: "Campanha nao encontrada nesta conta." };
  }

  const externalReference = `77GIRA-MOCK-${randomUUID()}`;
  const idempotencyKey = `create:${accountId}:${randomUUID()}`;
  const order = await prisma.adPaymentOrder.create({
    data: {
      accountId,
      campaignId: campaignId || null,
      provider: "mock",
      status: "created",
      packageCode: selectedPackage.code,
      amountCents: selectedPackage.amountCents,
      creditAmount: selectedPackage.credits,
      currency: "BRL",
      externalReference,
      providerPaymentId: `MOCK-${randomUUID()}`,
      idempotencyKey,
      returnPath: sanitizePaymentReturnPath(returnPath),
      createdByUserId: userId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      metadata: { simulation: true, packageName: selectedPackage.name }
    }
  });
  return {
    item: order,
    checkoutPath: `/workspace/anunciante/pagamento/mock/${order.id}`
  };
}

async function approveOrder(tx, order, actorUserId) {
  const claimed = await tx.adPaymentOrder.updateMany({
    where: { id: order.id, status: { in: ["created", "pending"] } },
    data: { status: "approved", approvedAt: new Date() }
  });
  if (claimed.count === 0) return tx.adPaymentOrder.findUnique({ where: { id: order.id } });

  await tx.advertiserWallet.upsert({
    where: { accountId: order.accountId },
    create: { accountId: order.accountId, balance: 0 },
    update: {}
  });
  const creditedWallet = await tx.advertiserWallet.update({
    where: { accountId: order.accountId },
    data: { balance: { increment: order.creditAmount } }
  });
  await tx.adCreditLedgerEntry.create({
    data: {
      accountId: order.accountId,
      campaignId: order.campaignId,
      paymentOrderId: order.id,
      type: "purchase",
      delta: order.creditAmount,
      balanceAfter: creditedWallet.balance,
      idempotencyKey: `payment:${order.id}:approved`,
      description: "Patacos creditados por pagamento mock aprovado.",
      createdByUserId: actorUserId,
      metadata: { simulation: true, provider: "mock" }
    }
  });

  if (order.campaignId) {
    const allocatedWallet = await tx.advertiserWallet.update({
      where: { accountId: order.accountId },
      data: { balance: { decrement: order.creditAmount } }
    });
    await tx.adCampaign.update({
      where: { id: order.campaignId },
      data: { budgetCredits: { increment: order.creditAmount } }
    });
    await tx.adCreditLedgerEntry.create({
      data: {
        accountId: order.accountId,
        campaignId: order.campaignId,
        paymentOrderId: order.id,
        type: "campaign_allocation",
        delta: -order.creditAmount,
        balanceAfter: allocatedWallet.balance,
        idempotencyKey: `payment:${order.id}:allocation`,
        description: "Patacos vinculados automaticamente a campanha selecionada.",
        createdByUserId: actorUserId,
        metadata: { simulation: true }
      }
    });
  }
  return tx.adPaymentOrder.findUnique({ where: { id: order.id } });
}

export async function processMockPaymentOrder({ orderId, outcome, userId, skipAccess = false }) {
  const runtime = paymentRuntime();
  if (!runtime.available) {
    return { error: "mock_payment_not_available", status: 404, message: "A simulacao de pagamento nao esta habilitada." };
  }
  const order = await prisma.adPaymentOrder.findUnique({ where: { id: orderId } });
  if (!order || order.provider !== "mock") return { error: "payment_order_not_found", status: 404, message: "Ordem de pagamento nao encontrada." };
  if (!skipAccess) {
    const membership = await getActiveAdvertiserMembership(userId, order.accountId);
    if (!membership) return { error: "advertiser_access_denied", status: 403, message: "Sem acesso a esta ordem." };
  }
  if (order.expiresAt && order.expiresAt < new Date() && !["approved", "refunded"].includes(order.status)) {
    const expired = await prisma.adPaymentOrder.update({ where: { id: order.id }, data: { status: "expired" } });
    return { item: expired };
  }
  if (outcome === "approved") {
    return { item: await prisma.$transaction((tx) => approveOrder(tx, order, userId)) };
  }
  if (["pending", "rejected", "cancelled"].includes(outcome)) {
    if (!["created", "pending"].includes(order.status)) return { item: order };
    const timestamp = new Date();
    const item = await prisma.adPaymentOrder.update({
      where: { id: order.id },
      data: {
        status: outcome,
        rejectedAt: outcome === "rejected" ? timestamp : undefined,
        cancelledAt: outcome === "cancelled" ? timestamp : undefined
      }
    });
    return { item };
  }
  return { error: "invalid_mock_outcome", status: 400, message: "Resultado de simulacao invalido." };
}

export async function allocateWalletCreditsToCampaign({ accountId, campaignId, amount, userId }) {
  const runtime = paymentRuntime();
  if (!runtime.creditsEnabled) {
    return { error: "credits_not_available", status: 404, message: "A carteira de patacos nao esta habilitada." };
  }
  const membership = await getActiveAdvertiserMembership(userId, accountId);
  if (!membership) return { error: "advertiser_access_denied", status: 403, message: "Sem acesso a esta carteira." };
  if (!BILLING_ROLES.includes(membership.role)) {
    return { error: "advertiser_billing_denied", status: 403, message: "Seu papel nao permite vincular patacos a campanhas." };
  }

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.adCampaign.findFirst({ where: { id: campaignId, advertiserAccountId: accountId } });
    if (!campaign) return { error: "campaign_not_found", status: 404, message: "Campanha nao encontrada nesta conta." };

    // O débito condicional evita que duas janelas gastem o mesmo saldo ao mesmo tempo.
    const debited = await tx.advertiserWallet.updateMany({
      where: { accountId, balance: { gte: amount } },
      data: { balance: { decrement: amount } }
    });
    if (debited.count !== 1) {
      return { error: "insufficient_wallet_credits", status: 409, message: "A carteira nao possui patacos suficientes para esta vinculação." };
    }

    const wallet = await tx.advertiserWallet.findUnique({ where: { accountId } });
    const item = await tx.adCampaign.update({
      where: { id: campaignId },
      data: { budgetCredits: { increment: amount } },
      include: { creatives: true }
    });
    await tx.adCreditLedgerEntry.create({
      data: {
        accountId,
        campaignId,
        type: "campaign_allocation",
        delta: -amount,
        balanceAfter: wallet?.balance || 0,
        idempotencyKey: `wallet-allocation:${campaignId}:${randomUUID()}`,
        description: "Patacos da carteira vinculados a campanha.",
        createdByUserId: userId,
        metadata: { source: "wallet" }
      }
    });
    return { item, walletBalance: wallet?.balance || 0 };
  });
}

export async function getWalletSnapshot(accountId) {
  const [wallet, entries, orders] = await Promise.all([
    prisma.advertiserWallet.findUnique({ where: { accountId } }),
    prisma.adCreditLedgerEntry.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.adPaymentOrder.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 10 })
  ]);
  return { balance: wallet?.balance || 0, entries, orders, packages: Object.values(AD_CREDIT_PACKAGES), runtime: paymentRuntime() };
}

export async function getBillingOperationsSnapshot() {
  const [orders, wallets, entries] = await Promise.all([
    prisma.adPaymentOrder.findMany({
      include: {
        account: { select: { id: true, name: true, type: true } },
        campaign: { select: { id: true, name: true } },
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.advertiserWallet.findMany({ include: { account: { select: { id: true, name: true, type: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.adCreditLedgerEntry.findMany({
      include: { account: { select: { id: true, name: true } }, campaign: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);
  const byStatus = orders.reduce((result, item) => ({ ...result, [item.status]: (result[item.status] || 0) + 1 }), {});
  return {
    runtime: paymentRuntime(),
    summary: {
      orders: orders.length,
      approvedCredits: orders.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.creditAmount, 0),
      availableWalletCredits: wallets.reduce((sum, item) => sum + item.balance, 0),
      byStatus
    },
    orders,
    wallets,
    entries
  };
}
