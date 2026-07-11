import { prisma } from "../lib/prisma.js";

const DAY = 24 * 60 * 60 * 1000;

function beforeDays(now, days) {
  return new Date(now.getTime() - days * DAY);
}

/**
 * This is intentionally a dry-run inventory. It provides the operational
 * evidence needed to approve retention periods before any destructive worker
 * is introduced. Counts only: no user IDs, contacts, sessions or content.
 */
export async function getPrivacyRetentionPreview(now = new Date()) {
  const thresholds = {
    expiredRefreshTokensDays: 30,
    inactivePushSubscriptionsDays: 90,
    inactiveAudienceVisitorsDays: 180,
    expiredToNaPistaSessionsDays: 7,
    expiredDeliveryTokensDays: 30
  };
  const [refreshTokens, pushSubscriptions, audienceVisitors, toNaPistaSessions, adDeliveries] = await Promise.all([
    prisma.refreshToken.count({ where: { expiresAt: { lt: beforeDays(now, thresholds.expiredRefreshTokensDays) } } }),
    prisma.pushSubscription.count({ where: { isActive: false, updatedAt: { lt: beforeDays(now, thresholds.inactivePushSubscriptionsDays) } } }),
    prisma.audienceVisitor.count({ where: { lastSeenAt: { lt: beforeDays(now, thresholds.inactiveAudienceVisitorsDays) } } }),
    prisma.toNaPistaSession.count({ where: { expiresAt: { lt: beforeDays(now, thresholds.expiredToNaPistaSessionsDays) } } }),
    prisma.adDelivery.count({ where: { expiresAt: { lt: beforeDays(now, thresholds.expiredDeliveryTokensDays) } } })
  ]);

  return {
    mode: "dry_run",
    generatedAt: now.toISOString(),
    disclaimer: "Nenhum dado foi removido. Os prazos exigem validação jurídica e aprovação operacional antes de qualquer descarte.",
    candidates: [
      { category: "refresh_tokens_expired", count: refreshTokens, proposedRetentionDays: thresholds.expiredRefreshTokensDays, proposedAction: "delete_after_approval" },
      { category: "push_subscriptions_inactive", count: pushSubscriptions, proposedRetentionDays: thresholds.inactivePushSubscriptionsDays, proposedAction: "delete_after_approval" },
      { category: "audience_visitors_inactive", count: audienceVisitors, proposedRetentionDays: thresholds.inactiveAudienceVisitorsDays, proposedAction: "anonymize_or_delete_after_approval" },
      { category: "to_na_pista_sessions_expired", count: toNaPistaSessions, proposedRetentionDays: thresholds.expiredToNaPistaSessionsDays, proposedAction: "delete_after_approval" },
      { category: "ads_delivery_tokens_expired", count: adDeliveries, proposedRetentionDays: thresholds.expiredDeliveryTokensDays, proposedAction: "anonymize_or_delete_after_approval" }
    ]
  };
}
