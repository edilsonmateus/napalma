import { prisma } from "../lib/prisma.js";
import { getSecurityReadiness } from "../config/env.js";
import { z } from "zod";

const operationsAccessSchema = z.object({
  email: z.string().trim().email().max(160),
  scope: z.enum(["privacy", "claims", "catalog", "notifications", "audit", "settings"]),
  enabled: z.boolean()
});

export async function listOperationsAccessGrants(_req, res, next) {
  try {
    const items = await prisma.operationAccessGrant.findMany({
      where: { revokedAt: null },
      orderBy: [{ scope: "asc" }, { createdAt: "desc" }],
      select: {
        id: true, scope: true, createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        grantedBy: { select: { firstName: true, lastName: true } }
      }
    });
    return res.json({ items: items.map((item) => ({
      id: item.id, scope: item.scope, createdAt: item.createdAt,
      user: { id: item.user.id, name: [item.user.firstName, item.user.lastName].filter(Boolean).join(" ") || "Conta interna", email: item.user.email },
      grantedBy: [item.grantedBy.firstName, item.grantedBy.lastName].filter(Boolean).join(" ") || "Admin"
    })) });
  } catch (error) { next(error); }
}

export async function setOperationsAccessGrant(req, res, next) {
  try {
    const { email, scope, enabled } = operationsAccessSchema.parse(req.body || {});
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true, role: true } });
    if (!user) return res.status(404).json({ error: "operations_user_not_found", message: "Nenhuma conta foi encontrada para este e-mail." });
    if (user.role === "admin") return res.status(409).json({ error: "operations_admin_scope_not_needed", message: "Administradores já possuem acesso total e não precisam de escopo delegado." });
    const grant = await prisma.operationAccessGrant.upsert({
      where: { userId_scope: { userId: user.id, scope } },
      create: { userId: user.id, scope, grantedByUserId: req.user.id, revokedAt: enabled ? null : new Date() },
      update: { grantedByUserId: req.user.id, revokedAt: enabled ? null : new Date() },
      select: { id: true, scope: true, revokedAt: true }
    });
    await prisma.auditLog.create({ data: { actorUserId: req.user.id, action: enabled ? "operations.access_granted" : "operations.access_revoked", subjectType: "operation_access_grant", subjectId: grant.id, metadata: { targetUserId: user.id, scope } } });
    return res.json({ item: { id: grant.id, scope: grant.scope, enabled: !grant.revokedAt }, message: enabled ? "Acesso interno concedido." : "Acesso interno revogado." });
  } catch (error) { next(error); }
}

/**
 * Returns only configuration posture, never configuration values or secrets.
 * This keeps the operations centre useful without turning it into a secret
 * management console.
 */
export async function getOperationsSettingsOverview(_req, res, next) {
  try {
    const [auditEvents, openPrivacyRequests] = await Promise.all([
      prisma.auditLog.count(),
      prisma.privacyRequest.count({ where: { status: { in: ["received", "in_review"] } } })
    ]);
    const security = getSecurityReadiness();
    return res.json({
      item: {
        environment: security.environment,
        ready: security.ready,
        checks: security.checks.map(({ key, label, ok, required }) => ({ key, label, ok, required })),
        auditEvents,
        openPrivacyRequests
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Aggregate public-catalogue quality signals for internal triage. This is not
 * a punishment workflow: it helps the team find incomplete public records.
 */
export async function getOperationsModerationQueue(_req, res, next) {
  try {
    const now = new Date();
    const [venues, events] = await Promise.all([
      prisma.venue.findMany({
        select: {
          id: true, name: true, city: true, neighborhood: true, imageUrl: true, description: true,
          events: { where: { startDate: { gte: now } }, take: 1, select: { id: true } }
        },
        orderBy: { updatedAt: "desc" },
        take: 100
      }),
      prisma.event.findMany({
        where: { startDate: { gte: now } },
        select: {
          id: true, title: true, imageUrl: true, description: true, startDate: true,
          venue: { select: { name: true } },
          // EventArtist is identified by the composite eventId/artistId key.
          artists: { select: { artistId: true }, take: 1 }
        },
        orderBy: { startDate: "asc" },
        take: 100
      })
    ]);

    const items = [
      ...venues.flatMap((venue) => {
        const issues = [];
        if (!venue.imageUrl) issues.push("Sem imagem pública");
        if (!venue.description) issues.push("Sem descrição");
        if (!venue.events.length) issues.push("Sem agenda futura");
        return issues.map((issue) => ({ id: `venue-${venue.id}-${issue}`, entityType: "venue", entityId: venue.id, entity: venue.name, context: [venue.neighborhood, venue.city].filter(Boolean).join(" · "), issue, risk: issue === "Sem agenda futura" ? "low" : "medium" }));
      }),
      ...events.flatMap((event) => {
        const issues = [];
        if (!event.imageUrl) issues.push("Sem imagem de divulgação");
        if (!event.description) issues.push("Sem descrição pública");
        if (!event.artists.length) issues.push("Sem artista vinculado");
        return issues.map((issue) => ({ id: `event-${event.id}-${issue}`, entityType: "event", entityId: event.id, entity: event.title, context: event.venue.name, issue, risk: issue === "Sem artista vinculado" ? "medium" : "low", startsAt: event.startDate }));
      })
    ].slice(0, 120);

    return res.json({ items });
  } catch (error) {
    next(error);
  }
}
