import { prisma } from "../lib/prisma.js";

/** Returns the latest decision, preserving the append-only consent history. */
export async function getLatestPrivacyConsent(userId, purpose) {
  if (!userId || !purpose) return null;
  return prisma.privacyConsentRecord.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: "desc" },
    select: { id: true, isGranted: true, policyVersion: true, createdAt: true }
  });
}

export async function hasActivePrivacyConsent(userId, purpose) {
  const latest = await getLatestPrivacyConsent(userId, purpose);
  return Boolean(latest?.isGranted);
}
