import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { isFeatureEnabled } from "../middlewares/featureFlags.js";
import { AD_PRICING_VERSION, milipatacosToPatacos, patacosToMilipatacos, pricingSnapshotForSlots } from "./adPricing.service.js";

export const AD_CREDIT_PACKAGES = Object.freeze({
  test_controlled: { code: "test_controlled", name: "Teste controlado", patacos: 100, amountCents: 10000 },
  local_boost: { code: "local_boost", name: "Impulso local", patacos: 300, amountCents: 30000 },
  presence_campaign: { code: "presence_campaign", name: "Campanha de presenca", patacos: 750, amountCents: 75000 }
});

export const BILLING_ROLES = ["owner", "admin", "billing_manager"];
export const EXPERIENCE_GRANT_OPTIONS = [250, 500, 750];
export const EXPERIENCE_GRANT_DEFAULT_DAYS = 30;
export const EXPERIENCE_GRANT_REVIEW_WINDOW_DAYS = 90;
export const EXPERIENCE_GRANT_REVIEW_LIMIT_PATACOS = 750;

function experienceGrantSnapshot(grant) {
  return {
    ...grant,
    originalPatacos: milipatacosToPatacos(grant.originalMilipatacos),
    remainingPatacos: milipatacosToPatacos(grant.remainingMilipatacos),
    expiredPatacos: milipatacosToPatacos(grant.expiredMilipatacos)
  };
}

// Mantém a origem de cada milipataco rastreável. A entrega consome primeiro
// os créditos de experiência que vencem antes; o saldo pago permanece
// disponível para a parte final da campanha e para eventuais replanejamentos.
export async function consumeCampaignCreditAllocations(tx, { campaignId, amountMilipatacos }) {
  let remaining = BigInt(amountMilipatacos);
  if (remaining <= 0n) return { consumedMilipatacos: 0n, untrackedMilipatacos: 0n };

  const allocations = await tx.adCampaignCreditAllocation.findMany({
    where: { campaignId, reservedMilipatacos: { gt: 0n } },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }]
  });
  allocations.sort((left, right) => {
    if (left.source !== right.source) return left.source === "experience" ? -1 : 1;
    return 0;
  });

  for (const allocation of allocations) {
    if (remaining <= 0n) break;
    const consumed = allocation.reservedMilipatacos < remaining ? allocation.reservedMilipatacos : remaining;
    await tx.adCampaignCreditAllocation.update({
      where: { id: allocation.id },
      data: {
        reservedMilipatacos: { decrement: consumed },
        spentMilipatacos: { increment: consumed }
      }
    });
    remaining -= consumed;
  }
  return { consumedMilipatacos: BigInt(amountMilipatacos) - remaining, untrackedMilipatacos: remaining };
}

// Expira tanto o saldo ainda disponível quanto a parte promocional que estava
// reservada em campanhas. A verba adquirida nunca é tocada por este processo.
export async function reconcileExpiredExperienceCredits(accountId = null) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const grants = await tx.adExperienceGrant.findMany({
      where: { status: "active", expiresAt: { lte: now }, ...(accountId ? { accountId } : {}) },
      include: { allocations: { where: { reservedMilipatacos: { gt: 0 } } } }
    });
    let expiredMilipatacos = 0n;
    for (const grant of grants) {
      const claimed = await tx.adExperienceGrant.updateMany({
        where: { id: grant.id, status: "active", expiresAt: { lte: now } },
        data: { status: "expired", remainingMilipatacos: 0n }
      });
      if (claimed.count !== 1) continue;
      let reserved = 0n;
      for (const allocation of grant.allocations) {
        if (allocation.reservedMilipatacos <= 0n) continue;
        reserved += allocation.reservedMilipatacos;
        await tx.adCampaign.update({
          where: { id: allocation.campaignId },
          data: { reservedMilipatacos: { decrement: allocation.reservedMilipatacos } }
        });
        await tx.adCampaignCreditAllocation.update({
          where: { id: allocation.id },
          data: {
            expiredMilipatacos: { increment: allocation.reservedMilipatacos },
            reservedMilipatacos: 0n
          }
        });
      }
      const totalExpired = grant.remainingMilipatacos + reserved;
      await tx.adExperienceGrant.update({
        where: { id: grant.id },
        data: { expiredMilipatacos: { increment: totalExpired } }
      });
      if (totalExpired > 0n) {
        expiredMilipatacos += totalExpired;
        await tx.adCreditLedgerEntry.create({
          data: {
            accountId: grant.accountId,
            type: "experience_expired",
            delta: 0,
            balanceAfter: 0,
            amountMilipatacos: -totalExpired,
            balanceAfterMilipatacos: 0,
            idempotencyKey: `experience-grant:${grant.id}:expired`,
            description: "Créditos de experiência expirados.",
            metadata: { experienceGrantId: grant.id, expiresAt: grant.expiresAt.toISOString() }
          }
        });
      }
    }
    return { expiredMilipatacos };
  });
}

export async function grantExperienceCredits({ accountId, amountPatacos, validDays = EXPERIENCE_GRANT_DEFAULT_DAYS, reason, note, overrideReason, userId }) {
  const account = await prisma.advertiserAccount.findUnique({ where: { id: accountId } });
  if (!account || account.status !== "active") {
    return { error: "advertiser_account_not_active", status: 409, message: "A conta anunciante precisa estar aprovada para receber créditos de experiência." };
  }
  const patacos = Number(amountPatacos);
  if (!EXPERIENCE_GRANT_OPTIONS.includes(patacos)) {
    return { error: "invalid_experience_grant_amount", status: 400, message: "Escolha um lote de 250, 500 ou 750 Patacos." };
  }
  const days = Number(validDays);
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    return { error: "invalid_experience_grant_validity", status: 400, message: "A validade deve ficar entre 1 e 90 dias." };
  }
  if (!String(reason || "").trim()) {
    return { error: "experience_grant_reason_required", status: 400, message: "Informe o motivo da bonificação para o registro operacional." };
  }

  await reconcileExpiredExperienceCredits(accountId);
  const since = new Date(Date.now() - EXPERIENCE_GRANT_REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const recent = await prisma.adExperienceGrant.aggregate({
    where: { accountId, createdAt: { gte: since }, status: { not: "cancelled" } },
    _sum: { originalMilipatacos: true }
  });
  const recentMilipatacos = recent._sum.originalMilipatacos || 0n;
  const amountMilipatacos = patacosToMilipatacos(patacos);
  const projected = recentMilipatacos + amountMilipatacos;
  const threshold = patacosToMilipatacos(EXPERIENCE_GRANT_REVIEW_LIMIT_PATACOS);
  if (projected > threshold && !String(overrideReason || "").trim()) {
    return {
      error: "experience_grant_review_required",
      status: 409,
      message: "Esta conta ultrapassa 750 Patacos promocionais nos últimos 90 dias. Registre uma justificativa para liberar a nova concessão.",
      review: { recentPatacos: milipatacosToPatacos(recentMilipatacos), projectedPatacos: milipatacosToPatacos(projected), limitPatacos: EXPERIENCE_GRANT_REVIEW_LIMIT_PATACOS }
    };
  }
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const item = await prisma.$transaction(async (tx) => {
    const grant = await tx.adExperienceGrant.create({
      data: {
        accountId,
        originalMilipatacos: amountMilipatacos,
        remainingMilipatacos: amountMilipatacos,
        reason: String(reason).trim(),
        note: String(note || "").trim() || null,
        overrideReason: String(overrideReason || "").trim() || null,
        expiresAt,
        grantedByUserId: userId
      }
    });
    const promotional = await tx.adExperienceGrant.aggregate({
      where: { accountId, status: "active", expiresAt: { gt: new Date() } },
      _sum: { remainingMilipatacos: true }
    });
    await tx.adCreditLedgerEntry.create({
      data: {
        accountId,
        type: "experience_grant",
        delta: 0,
        balanceAfter: 0,
        amountMilipatacos,
        balanceAfterMilipatacos: promotional._sum.remainingMilipatacos || 0n,
        idempotencyKey: `experience-grant:${grant.id}`,
        description: `Créditos de experiência concedidos (${patacos} Patacos).`,
        metadata: { experienceGrantId: grant.id, expiresAt: expiresAt.toISOString(), reason: grant.reason },
        createdByUserId: userId
      }
    });
    return grant;
  });
  return { item: experienceGrantSnapshot(item) };
}

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
      creditAmount: selectedPackage.patacos,
      creditAmountMilipatacos: patacosToMilipatacos(selectedPackage.patacos),
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
    create: { accountId: order.accountId, balance: 0, balanceMilipatacos: 0 },
    update: {}
  });
  const creditedWallet = await tx.advertiserWallet.update({
    where: { accountId: order.accountId },
    data: { balance: { increment: order.creditAmount }, balanceMilipatacos: { increment: order.creditAmountMilipatacos } }
  });
  await tx.adCreditLedgerEntry.create({
    data: {
      accountId: order.accountId,
      campaignId: order.campaignId,
      paymentOrderId: order.id,
      type: "purchase",
      delta: order.creditAmount,
      balanceAfter: creditedWallet.balance,
      amountMilipatacos: order.creditAmountMilipatacos,
      balanceAfterMilipatacos: creditedWallet.balanceMilipatacos,
      idempotencyKey: `payment:${order.id}:approved`,
      description: "Patacos creditados por pagamento mock aprovado.",
      createdByUserId: actorUserId,
      metadata: { simulation: true, provider: "mock" }
    }
  });

  if (order.campaignId) {
    const allocatedWallet = await tx.advertiserWallet.update({
      where: { accountId: order.accountId },
      data: { balance: { decrement: order.creditAmount }, balanceMilipatacos: { decrement: order.creditAmountMilipatacos } }
    });
    const campaign = await tx.adCampaign.findUnique({ where: { id: order.campaignId }, include: { creatives: { select: { slot: true } } } });
    await tx.adCampaign.update({
      where: { id: order.campaignId },
      data: {
        budgetCredits: { increment: order.creditAmount },
        budgetMilipatacos: { increment: order.creditAmountMilipatacos },
        reservedMilipatacos: { increment: order.creditAmountMilipatacos },
        pricingSnapshot: campaign?.pricingSnapshot || pricingSnapshotForSlots((campaign?.creatives || []).map((creative) => creative.slot)),
        pricingVersion: campaign?.pricingVersion || AD_PRICING_VERSION
      }
    });
    await tx.adCampaignCreditAllocation.create({
      data: {
        campaignId: order.campaignId,
        source: "purchased",
        originalMilipatacos: order.creditAmountMilipatacos,
        reservedMilipatacos: order.creditAmountMilipatacos
      }
    });
    await tx.adCreditLedgerEntry.create({
      data: {
        accountId: order.accountId,
        campaignId: order.campaignId,
        paymentOrderId: order.id,
        type: "campaign_allocation",
        delta: -order.creditAmount,
        balanceAfter: allocatedWallet.balance,
        amountMilipatacos: -order.creditAmountMilipatacos,
        balanceAfterMilipatacos: allocatedWallet.balanceMilipatacos,
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

export async function allocateWalletCreditsToCampaign({ accountId, campaignId, amountMilipatacos, userId }) {
  const runtime = paymentRuntime();
  if (!runtime.creditsEnabled) {
    return { error: "credits_not_available", status: 404, message: "A carteira de patacos nao esta habilitada." };
  }
  const membership = await getActiveAdvertiserMembership(userId, accountId);
  if (!membership) return { error: "advertiser_access_denied", status: 403, message: "Sem acesso a esta carteira." };
  if (!BILLING_ROLES.includes(membership.role)) {
    return { error: "advertiser_billing_denied", status: 403, message: "Seu papel nao permite vincular patacos a campanhas." };
  }

  await reconcileExpiredExperienceCredits(accountId);
  await prisma.advertiserWallet.upsert({
    where: { accountId },
    create: { accountId, balance: 0, balanceMilipatacos: 0 },
    update: {}
  });
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.adCampaign.findFirst({ where: { id: campaignId, advertiserAccountId: accountId }, include: { creatives: { select: { slot: true } } } });
    if (!campaign) return { error: "campaign_not_found", status: 404, message: "Campanha nao encontrada nesta conta." };

    // O débito condicional evita que duas janelas gastem o mesmo saldo ao mesmo tempo.
    const amount = BigInt(amountMilipatacos);
    const grants = await tx.adExperienceGrant.findMany({
      where: { accountId, status: "active", expiresAt: { gt: new Date() }, remainingMilipatacos: { gt: 0 } },
      orderBy: { expiresAt: "asc" }
    });
    const promotionalAvailable = grants.reduce((sum, grant) => sum + grant.remainingMilipatacos, 0n);
    let promotionalUsed = promotionalAvailable < amount ? promotionalAvailable : amount;
    const purchasedAmount = amount - promotionalUsed;
    const debited = await tx.advertiserWallet.updateMany({
      where: { accountId, balanceMilipatacos: { gte: purchasedAmount } },
      data: { balanceMilipatacos: { decrement: purchasedAmount } }
    });
    if (debited.count !== 1) {
      return { error: "insufficient_wallet_credits", status: 409, message: "A carteira nao possui patacos suficientes para esta vinculação." };
    }

    for (const grant of grants) {
      if (promotionalUsed <= 0n) break;
      const used = grant.remainingMilipatacos < promotionalUsed ? grant.remainingMilipatacos : promotionalUsed;
      const after = grant.remainingMilipatacos - used;
      await tx.adExperienceGrant.update({
        where: { id: grant.id },
        data: { remainingMilipatacos: { decrement: used }, status: after === 0n ? "consumed" : "active" }
      });
      await tx.adCampaignCreditAllocation.create({
        data: { campaignId, experienceGrantId: grant.id, source: "experience", originalMilipatacos: used, reservedMilipatacos: used, expiresAt: grant.expiresAt }
      });
      promotionalUsed -= used;
    }
    if (purchasedAmount > 0n) {
      await tx.adCampaignCreditAllocation.create({ data: { campaignId, source: "purchased", originalMilipatacos: purchasedAmount, reservedMilipatacos: purchasedAmount } });
    }
    const wallet = await tx.advertiserWallet.findUnique({ where: { accountId } });
    const item = await tx.adCampaign.update({
      where: { id: campaignId },
      data: {
        budgetMilipatacos: { increment: amount },
        reservedMilipatacos: { increment: amount },
        pricingSnapshot: campaign.pricingSnapshot || pricingSnapshotForSlots(campaign.creatives.map((creative) => creative.slot)),
        pricingVersion: campaign.pricingVersion || AD_PRICING_VERSION
      },
      include: { creatives: true }
    });
    await tx.adCreditLedgerEntry.create({
      data: {
        accountId,
        campaignId,
        type: "campaign_allocation",
        delta: 0,
        balanceAfter: Math.floor(milipatacosToPatacos(wallet?.balanceMilipatacos || 0n)),
        amountMilipatacos: -amount,
        balanceAfterMilipatacos: wallet?.balanceMilipatacos || 0n,
        idempotencyKey: `wallet-allocation:${campaignId}:${randomUUID()}`,
        description: "Patacos da carteira vinculados a campanha.",
        createdByUserId: userId,
        metadata: { source: "wallet" }
      }
    });
    return { item, walletBalance: milipatacosToPatacos(wallet?.balanceMilipatacos || 0n) };
  });
}

export async function getWalletSnapshot(accountId) {
  await reconcileExpiredExperienceCredits(accountId);
  const [wallet, entries, orders, grants] = await Promise.all([
    prisma.advertiserWallet.findUnique({ where: { accountId } }),
    prisma.adCreditLedgerEntry.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.adPaymentOrder.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.adExperienceGrant.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 20 })
  ]);
  const purchasedMilipatacos = wallet?.balanceMilipatacos || 0n;
  const promotionalMilipatacos = grants.filter((grant) => grant.status === "active" && grant.expiresAt > new Date()).reduce((sum, grant) => sum + grant.remainingMilipatacos, 0n);
  const availableMilipatacos = purchasedMilipatacos + promotionalMilipatacos;
  return {
    balance: milipatacosToPatacos(availableMilipatacos),
    balanceMilipatacos: String(availableMilipatacos),
    purchasedBalance: milipatacosToPatacos(purchasedMilipatacos),
    purchasedBalanceMilipatacos: String(purchasedMilipatacos),
    experienceBalance: milipatacosToPatacos(promotionalMilipatacos),
    experienceBalanceMilipatacos: String(promotionalMilipatacos),
    experienceGrants: grants.map(experienceGrantSnapshot),
    entries,
    orders,
    packages: Object.values(AD_CREDIT_PACKAGES).map((item) => ({ ...item, credits: item.patacos, milipatacos: String(patacosToMilipatacos(item.patacos)) })),
    runtime: paymentRuntime()
  };
}

export async function getBillingOperationsSnapshot() {
  await reconcileExpiredExperienceCredits();
  const [orders, wallets, entries, experienceGrants] = await Promise.all([
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
    }),
    prisma.adExperienceGrant.findMany({
      include: { account: { select: { id: true, name: true, type: true } }, grantedBy: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);
  const byStatus = orders.reduce((result, item) => ({ ...result, [item.status]: (result[item.status] || 0) + 1 }), {});
  return {
    runtime: paymentRuntime(),
    summary: {
      orders: orders.length,
      approvedPatacos: orders.filter((item) => item.status === "approved").reduce((sum, item) => sum + milipatacosToPatacos(item.creditAmountMilipatacos), 0),
      availableWalletPatacos: wallets.reduce((sum, item) => sum + milipatacosToPatacos(item.balanceMilipatacos), 0),
      availableExperiencePatacos: experienceGrants.filter((item) => item.status === "active" && item.expiresAt > new Date()).reduce((sum, item) => sum + milipatacosToPatacos(item.remainingMilipatacos), 0),
      byStatus
    },
    orders,
    wallets,
    entries,
    experienceGrants: experienceGrants.map(experienceGrantSnapshot)
  };
}
