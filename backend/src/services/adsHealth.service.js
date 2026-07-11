import { AD_PLACEMENTS } from "../config/adPlacements.js";
import { prisma } from "../lib/prisma.js";
import { isFeatureEnabled } from "../middlewares/featureFlags.js";

function reviewIsApproved(status) {
  return !isFeatureEnabled("ADS_REVIEW_WORKFLOW_ENABLED") || !status || status === "approved";
}

/**
 * Aggregated operational signals only. This deliberately returns no user, IP
 * or session identifiers so it can safely feed the admin panel and webhooks.
 */
export async function getAdsHealthSnapshot(hours = 24) {
  const now = new Date();
  const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const [deliveries, recentEvents, campaigns, impressionsBySlot] = await Promise.all([
    prisma.adDelivery.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, campaignId: true, slot: true, sessionHash: true, createdAt: true, impressionRecordedAt: true, clickRecordedAt: true, expiresAt: true }
    }),
    prisma.adEventLog.findMany({
      where: { createdAt: { gte: since } },
      select: { campaignId: true, sessionId: true, type: true, createdAt: true }
    }),
    prisma.adCampaign.findMany({
      where: { status: "active", isEnabled: true },
      select: { id: true, name: true, advertiser: true, endsAt: true, budgetCredits: true, spentCredits: true, reviewStatus: true, creatives: { select: { isEnabled: true, reviewStatus: true } } }
    }),
    prisma.adEventLog.groupBy({ by: ["slot"], where: { type: "impression", createdAt: { gte: dayStart } }, _count: { _all: true } })
  ]);

  const alerts = [];
  const clickWithoutView = deliveries.filter((item) => item.clickRecordedAt && !item.impressionRecordedAt);
  if (clickWithoutView.length) alerts.push({ severity: "warning", code: "click_without_view", count: clickWithoutView.length, title: "Cliques sem impressão válida", detail: "Revise destinos, tempo de visibilidade e possíveis automações." });

  const abandonedDeliveries = deliveries.filter((item) => item.expiresAt < now && !item.impressionRecordedAt);
  if (abandonedDeliveries.length >= 10) alerts.push({ severity: "info", code: "unviewed_deliveries", count: abandonedDeliveries.length, title: "Entregas não visualizadas", detail: "Solicitações expiraram sem atingir o critério de visualização." });

  const impressionsBySession = new Map();
  for (const event of recentEvents) {
    if (event.type !== "impression" || !event.sessionId) continue;
    impressionsBySession.set(event.sessionId, (impressionsBySession.get(event.sessionId) || 0) + 1);
  }
  const highFrequencySessions = [...impressionsBySession.values()].filter((count) => count > 15).length;
  if (highFrequencySessions) alerts.push({ severity: "warning", code: "high_session_frequency", count: highFrequencySessions, title: "Frequência anormal por sessão", detail: "Uma ou mais sessões ultrapassaram 15 impressões no período monitorado." });

  const campaignEvents = new Map();
  for (const event of recentEvents) {
    const current = campaignEvents.get(event.campaignId) || { impressions: 0, clicks: 0 };
    if (event.type === "impression") current.impressions += 1;
    if (event.type === "click") current.clicks += 1;
    campaignEvents.set(event.campaignId, current);
  }
  const highCtr = [...campaignEvents.entries()].filter(([, value]) => value.impressions >= 12 && value.clicks / value.impressions > 0.6).length;
  if (highCtr) alerts.push({ severity: "warning", code: "high_ctr", count: highCtr, title: "CTR fora do padrão", detail: "Campanhas com volume suficiente e CTR acima de 60% devem ser revisadas." });

  const blockedCampaigns = campaigns.filter((campaign) => (
    !reviewIsApproved(campaign.reviewStatus)
    || campaign.spentCredits >= campaign.budgetCredits
    || (campaign.endsAt && campaign.endsAt < now)
    || !campaign.creatives.some((creative) => creative.isEnabled && reviewIsApproved(creative.reviewStatus))
  ));
  if (blockedCampaigns.length) alerts.push({ severity: "warning", code: "campaign_delivery_blocked", count: blockedCampaigns.length, title: "Campanhas ativas bloqueadas", detail: "Há campanhas ativas sem condição completa de entrega." });

  const impressionsMap = new Map(impressionsBySlot.map((item) => [item.slot, item._count._all]));
  const inventory = AD_PLACEMENTS.map((placement) => {
    const used = impressionsMap.get(placement.key) || 0;
    const capacity = Number(placement.inventory?.dailyImpressionCap || 0);
    return { slot: placement.key, capacity, used, remaining: Math.max(0, capacity - used), utilization: capacity ? Number(((used / capacity) * 100).toFixed(2)) : 0 };
  });
  const exhaustedSlots = inventory.filter((item) => item.remaining === 0 && item.capacity > 0);
  if (exhaustedSlots.length) alerts.push({ severity: "critical", code: "inventory_exhausted", count: exhaustedSlots.length, title: "Inventário esgotado", detail: "Um ou mais slots atingiram a capacidade diária de impressões válidas." });

  return {
    summary: {
      hours,
      deliveries: deliveries.length,
      validImpressions: recentEvents.filter((item) => item.type === "impression").length,
      clicks: recentEvents.filter((item) => item.type === "click").length,
      alertCount: alerts.length,
      criticalCount: alerts.filter((item) => item.severity === "critical").length
    },
    alerts,
    inventory,
    blockedCampaigns: blockedCampaigns.map((item) => ({ id: item.id, name: item.name, advertiser: item.advertiser }))
  };
}
