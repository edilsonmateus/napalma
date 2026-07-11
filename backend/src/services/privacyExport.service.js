import { prisma } from "../lib/prisma.js";

/** Builds a portable, human-readable snapshot for the authenticated account.
 * It intentionally excludes password hashes, refresh tokens, raw IPs, other
 * users' data and internal antifraud signals. */
export async function buildPrivacyExport(userId) {
  const [account, consents, requests, radar, history, follows, claims, artistAccesses, advertiserMemberships, toNaPistaSessions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, username: true, firstName: true, lastName: true, phone: true, instagramHandle: true, avatarUrl: true, city: true, neighborhood: true, postalCode: true, role: true, createdAt: true, updatedAt: true } }),
    prisma.privacyConsentRecord.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { purpose: true, isGranted: true, policyVersion: true, source: true, createdAt: true } }),
    prisma.privacyRequest.findMany({ where: { userId }, orderBy: { requestedAt: "asc" }, select: { type: true, status: true, details: true, requestedAt: true, resolvedAt: true, resolutionNote: true } }),
    prisma.markedEvent.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { createdAt: true, event: { select: { id: true, title: true, startDate: true, venue: { select: { id: true, name: true } } } } } }),
    prisma.userEventHistory.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { createdAt: true, event: { select: { id: true, title: true, startDate: true, venue: { select: { id: true, name: true } } } } } }),
    prisma.artistFollow.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { createdAt: true, artist: { select: { id: true, name: true, slug: true } } } }),
    prisma.claimRequest.findMany({ where: { requestedById: userId }, orderBy: { createdAt: "asc" }, select: { id: true, targetType: true, requestType: true, status: true, justification: true, requestedChanges: true, legalAcknowledgedAt: true, legalAcknowledgementVersion: true, responsibleName: true, responsiblePhone: true, claimantDocument: true, relationshipRole: true, officialEmail: true, officialInstagram: true, officialWebsite: true, decisionNote: true, createdAt: true, reviewedAt: true, venue: { select: { id: true, name: true } }, artist: { select: { id: true, name: true } } } }),
    prisma.artistAccess.findMany({ where: { userId }, select: { role: true, status: true, acceptedAt: true, artist: { select: { id: true, name: true, slug: true } } } }),
    prisma.advertiserMembership.findMany({ where: { userId }, select: { role: true, status: true, acceptedAt: true, account: { select: { id: true, name: true, type: true, status: true } } } }),
    prisma.toNaPistaSession.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { startsAt: true, expiresAt: true, isActive: true, maxNotifications: true, notificationsSent: true, latitude: true, longitude: true } })
  ]);

  return {
    format: "77gira-personal-data-export",
    version: "1.0",
    generatedAt: new Date().toISOString(),
    notice: "Este arquivo contém dados associados à sua conta. Guarde-o em local seguro.",
    account,
    privacy: { consents, requests },
    activity: { radar, history, followedArtists: follows },
    professional: { claims, artistAccesses, advertiserMemberships },
    proximity: { toNaPistaSessions }
  };
}
