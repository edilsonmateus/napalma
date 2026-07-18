import { ClaimStatus, ClaimTargetType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../services/audit.service.js";

const CLAIM_LEGAL_VERSION = "CLAIM_RESPONSIBILITY_V1";

const createClaimSchema = z
  .object({
    targetType: z.enum(["venue", "artist"]),
    requestType: z.enum(["ownership", "team_access", "artist_inclusion", "venue_update"]).optional().default("ownership"),
    venueId: z.string().uuid().optional(),
    artistId: z.string().uuid().optional(),
    responsibleName: z.string().trim().min(3).max(120).optional(),
    responsiblePhone: z.string().trim().min(8).max(30).optional(),
    claimantDocument: z.string().trim().min(5).max(40).optional(),
    relationshipRole: z.string().trim().min(3).max(120).optional(),
    officialEmail: z.string().trim().email().max(160).optional(),
    officialInstagram: z.string().trim().max(120).optional(),
    officialWebsite: z.string().trim().url().max(255).optional(),
    justification: z.string().trim().min(5).max(500),
    requestedChanges: z.record(z.any()).optional(),
    legalAcknowledgement: z.object({
      accepted: z.literal(true),
      version: z.literal(CLAIM_LEGAL_VERSION)
    })
  })
  .superRefine((data, ctx) => {
    if (data.targetType === "venue" && !data.venueId) {
      ctx.addIssue({ code: "custom", path: ["venueId"], message: "Informe a casa para reivindicacao." });
    }
    if (data.targetType === "artist" && data.requestType !== "artist_inclusion" && !data.artistId) {
      ctx.addIssue({ code: "custom", path: ["artistId"], message: "Informe o artista para reivindicacao." });
    }
    if (data.requestType === "artist_inclusion") {
      const artistName = data.requestedChanges?.artistName;
      if (typeof artistName !== "string" || artistName.trim().length < 2) {
        ctx.addIssue({ code: "custom", path: ["requestedChanges", "artistName"], message: "Informe o nome artistico." });
      }
    }
    if (["ownership", "team_access", "artist_inclusion"].includes(data.requestType)) {
      if (!data.responsibleName) {
        ctx.addIssue({ code: "custom", path: ["responsibleName"], message: "Informe o nome do responsavel." });
      }
      if (!data.responsiblePhone) {
        ctx.addIssue({ code: "custom", path: ["responsiblePhone"], message: "Informe telefone de contato." });
      }
      if (!data.claimantDocument) {
        ctx.addIssue({ code: "custom", path: ["claimantDocument"], message: "Informe CNPJ/CPF do solicitante." });
      }
      if (!data.relationshipRole) {
        ctx.addIssue({ code: "custom", path: ["relationshipRole"], message: "Informe seu vinculo com a casa/artista." });
      }
    }
  });

const claimDecisionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  decisionNote: z.string().trim().max(400).optional()
});

const claimIdSchema = z.object({
  id: z.string().uuid()
});

const operationsClaimsListSchema = z.object({
  status: z.enum(["all", "pending", "approved", "rejected"]).default("all"),
  query: z.string().trim().max(120).optional().default(""),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

function slugify(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function mapClaim(claim) {
  return {
    id: claim.id,
    targetType: claim.targetType,
    status: claim.status,
    requestType: claim.requestType || "ownership",
    justification: claim.justification ?? "",
    requestedChanges: claim.requestedChanges ?? null,
    legalAcknowledgement: claim.legalAcknowledgedAt ? {
      acceptedAt: claim.legalAcknowledgedAt,
      version: claim.legalAcknowledgementVersion
    } : null,
    evidence: {
      responsibleName: claim.responsibleName ?? "",
      responsiblePhone: claim.responsiblePhone ?? "",
      claimantDocument: claim.claimantDocument ?? "",
      relationshipRole: claim.relationshipRole ?? "",
      officialEmail: claim.officialEmail ?? "",
      officialInstagram: claim.officialInstagram ?? "",
      officialWebsite: claim.officialWebsite ?? ""
    },
    decisionNote: claim.decisionNote ?? "",
    createdAt: claim.createdAt,
    reviewedAt: claim.reviewedAt,
    venue: claim.venue
      ? {
          id: claim.venue.id,
          name: claim.venue.name,
          region: claim.venue.region,
          contactName: claim.venue.contactName ?? "",
          contactPhone: claim.venue.contactPhone ?? ""
        }
      : null,
    artist: claim.artist
      ? { id: claim.artist.id, name: claim.artist.name }
      : null,
    requestedBy: claim.requestedBy
      ? {
          id: claim.requestedBy.id,
          name: `${claim.requestedBy.firstName} ${claim.requestedBy.lastName}`.trim(),
          email: claim.requestedBy.email
        }
      : null,
    reviewedBy: claim.reviewedBy
      ? {
          id: claim.reviewedBy.id,
          name: `${claim.reviewedBy.firstName} ${claim.reviewedBy.lastName}`.trim(),
          email: claim.reviewedBy.email
        }
      : null
  };
}

function operationalClaimRisk(claim) {
  if (claim.requestType === "ownership" || claim.requestType === "artist_inclusion") return "high";
  if (claim.requestType === "team_access") return "medium";
  return "low";
}

function mapOperationsClaim(claim) {
  const target = claim.artist?.name || claim.venue?.name || "Perfil em inclusão";
  const requesterName = [claim.requestedBy?.firstName, claim.requestedBy?.lastName].filter(Boolean).join(" ") || "Pessoa solicitante";
  return {
    id: claim.id,
    protocol: `RA-${claim.id.slice(0, 8).toUpperCase()}`,
    target,
    targetType: claim.targetType,
    requestType: claim.requestType || "ownership",
    status: claim.status,
    requesterName,
    createdAt: claim.createdAt,
    risk: operationalClaimRisk(claim),
    responsible: claim.reviewedBy ? [claim.reviewedBy.firstName, claim.reviewedBy.lastName].filter(Boolean).join(" ") : null
  };
}

export async function createClaimRequest(req, res, next) {
  try {
    const isProducer = req.user?.role === "producer";
    const isHouse = req.user?.role === "venue_manager";
    const isAttendee = req.user?.role === "attendee";
    if (!isProducer && !isHouse && !isAttendee) {
      return res.status(403).json({
        error: "forbidden",
        message: "Seu perfil nao pode abrir reivindicacoes."
      });
    }
    const data = createClaimSchema.parse(req.body);

    if (isHouse && data.targetType !== ClaimTargetType.venue) {
      return res.status(403).json({
        error: "forbidden",
        message: "Perfil casa pode reivindicar somente casas."
      });
    }
    if (isAttendee && data.targetType !== ClaimTargetType.artist) {
      return res.status(403).json({ error: "forbidden", message: "Usuario comum pode reivindicar somente artistas." });
    }

    if (data.targetType === ClaimTargetType.venue) {
      const venue = await prisma.venue.findUnique({ where: { id: data.venueId }, select: { id: true } });
      if (!venue) return res.status(404).json({ error: "venue_not_found", message: "Casa nao encontrada." });
    }
    if (data.targetType === ClaimTargetType.artist && data.requestType !== "artist_inclusion") {
      const artist = await prisma.artist.findUnique({ where: { id: data.artistId }, select: { id: true, _count: { select: { accesses: { where: { status: "active" } }, producerAccesses: true } } } });
      if (!artist) return res.status(404).json({ error: "artist_not_found", message: "Artista nao encontrado." });
      const claimed = artist._count.accesses > 0 || artist._count.producerAccesses > 0;
      if (data.requestType === "ownership" && claimed) return res.status(409).json({ error: "artist_already_claimed", message: "Este perfil já possui equipe. Solicite acesso em vez de reivindicar a propriedade." });
      if (data.requestType === "team_access" && !claimed) return res.status(409).json({ error: "artist_without_owner", message: "Este perfil ainda não possui equipe. Faça uma reivindicação de propriedade." });
    }

    const existingPending = await prisma.claimRequest.findFirst({
      where: {
        requestedById: req.user.id,
        targetType: data.targetType,
        venueId: data.venueId ?? null,
        artistId: data.artistId ?? null,
        status: ClaimStatus.pending
      },
      select: { id: true }
    });

    if (existingPending) {
      return res.status(409).json({
        error: "claim_already_pending",
        message: "Ja existe reivindicacao pendente para este item."
      });
    }

    const claim = await prisma.claimRequest.create({
      data: {
        requestedById: req.user.id,
        targetType: data.targetType,
        requestType: data.requestType,
        venueId: data.venueId ?? null,
        artistId: data.artistId ?? null,
        justification: data.justification,
        requestedChanges: data.requestedChanges ?? null,
        legalAcknowledgedAt: new Date(),
        legalAcknowledgementVersion: data.legalAcknowledgement.version,
        responsibleName: data.responsibleName ?? null,
        responsiblePhone: data.responsiblePhone ?? null,
        claimantDocument: data.claimantDocument ?? null,
        relationshipRole: data.relationshipRole ?? null,
        officialEmail: data.officialEmail ?? null,
        officialInstagram: data.officialInstagram ?? null,
        officialWebsite: data.officialWebsite ?? null
      },
      include: {
        venue: true,
        artist: true,
        requestedBy: true,
        reviewedBy: true
      }
    });

    await recordAuditEvent({ req, action: "claim.created", subjectType: "claim", subjectId: claim.id, metadata: { targetType: claim.targetType, requestType: claim.requestType, venueId: claim.venueId || null, artistId: claim.artistId || null, legalVersion: claim.legalAcknowledgementVersion } });

    return res.status(201).json({ item: mapClaim(claim) });
  } catch (error) {
    next(error);
  }
}

export async function listMyClaims(req, res, next) {
  try {
    const items = await prisma.claimRequest.findMany({
      where: { requestedById: req.user.id },
      include: {
        venue: true,
        artist: true,
        requestedBy: true,
        reviewedBy: true
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ items: items.map(mapClaim) });
  } catch (error) {
    next(error);
  }
}

export async function listClaims(req, res, next) {
  try {
    const status = z.enum(["pending", "approved", "rejected"]).optional().parse(req.query.status);
    const items = await prisma.claimRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        venue: true,
        artist: true,
        requestedBy: true,
        reviewedBy: true
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });
    res.json({ items: items.map(mapClaim) });
  } catch (error) {
    next(error);
  }
}

/** Redacted list for the internal Operations Center. Evidence and contacts stay out of queues. */
export async function listOperationsClaims(req, res, next) {
  try {
    const { status, query, limit } = operationsClaimsListSchema.parse(req.query || {});
    const queryFilter = query ? {
      OR: [
        { id: { contains: query, mode: "insensitive" } },
        { artist: { is: { name: { contains: query, mode: "insensitive" } } } },
        { venue: { is: { name: { contains: query, mode: "insensitive" } } } },
        { requestedBy: { is: { firstName: { contains: query, mode: "insensitive" } } } },
        { requestedBy: { is: { lastName: { contains: query, mode: "insensitive" } } } }
      ]
    } : {};
    const items = await prisma.claimRequest.findMany({
      where: { ...(status !== "all" ? { status } : {}), ...queryFilter },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: limit,
      select: {
        id: true, targetType: true, requestType: true, status: true, createdAt: true,
        artist: { select: { name: true } }, venue: { select: { name: true } },
        requestedBy: { select: { firstName: true, lastName: true } },
        reviewedBy: { select: { firstName: true, lastName: true } }
      }
    });
    return res.json({ items: items.map(mapOperationsClaim) });
  } catch (error) { next(error); }
}

/** Explicit detail opening is audited because it exposes evidence and contact information. */
export async function getOperationsClaimDetail(req, res, next) {
  try {
    const { id } = claimIdSchema.parse(req.params);
    const claim = await prisma.claimRequest.findUnique({
      where: { id },
      include: {
        venue: { select: { id: true, name: true, region: true, city: true } },
        artist: { select: { id: true, name: true, isVerified: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true, username: true, role: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });
    if (!claim) return res.status(404).json({ error: "claim_not_found", message: "Reivindicação não encontrada." });
    await recordAuditEvent({ req, action: "claim.operations_detail_opened", subjectType: "claim", subjectId: claim.id, metadata: { purpose: "operations_center", sensitiveFields: ["contact", "document", "evidence"] } });
    return res.json({ item: { ...mapOperationsClaim(claim), claim: mapClaim(claim) } });
  } catch (error) { next(error); }
}

export async function decideClaim(req, res, next) {
  try {
    const { id } = claimIdSchema.parse(req.params);
    const data = claimDecisionSchema.parse(req.body);

    const existing = await prisma.claimRequest.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "claim_not_found", message: "Reivindicacao nao encontrada." });
    }
    if (existing.status !== ClaimStatus.pending) {
      return res.status(409).json({ error: "claim_already_decided", message: "Reivindicacao ja foi decidida." });
    }

    const updated = await prisma.$transaction(async (tx) => {
      let includedArtistId = null;
      if (data.status === ClaimStatus.approved) {
        if (existing.requestType === "artist_inclusion" && existing.targetType === ClaimTargetType.artist) {
          const requested = existing.requestedChanges && typeof existing.requestedChanges === "object" ? existing.requestedChanges : {};
          const artistName = String(requested.artistName || "").trim();
          if (!artistName) throw new Error("artist_inclusion_name_missing");
          const duplicate = await tx.artist.findFirst({ where: { name: { equals: artistName, mode: "insensitive" } }, select: { id: true } });
          if (duplicate) throw Object.assign(new Error("artist_already_exists"), { status: 409 });
          const baseSlug = slugify(artistName) || "artista";
          const slugTaken = await tx.artist.findUnique({ where: { slug: baseSlug }, select: { id: true } });
          const artist = await tx.artist.create({
            data: {
              name: artistName,
              slug: slugTaken ? `${baseSlug}-${existing.id.slice(0, 6)}` : baseSlug,
              genres: Array.isArray(requested.genres) ? requested.genres.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 12) : ["samba"],
              isVerified: true,
              verifiedAt: new Date(),
              verifiedByUserId: req.user.id,
              professionalProfile: {
                create: {
                  baseCity: String(requested.baseCity || "").trim() || null,
                  baseState: String(requested.baseState || "").trim() || null
                }
              }
            }
          });
          includedArtistId = artist.id;
          await tx.artistAccess.create({ data: { artistId: artist.id, userId: existing.requestedById, role: "owner", status: "active", acceptedAt: new Date(), invitedByUserId: req.user.id } });
        }
        if (existing.requestType === "venue_update" && existing.targetType === ClaimTargetType.venue && existing.venueId) {
          const allowed = [
            "name",
            "description",
            "contactName",
            "contactPhone",
            "instagramUrl",
            "address",
            "neighborhood",
            "region",
            "city",
            "state",
            "imageUrl",
            "openDays"
          ];
          const incoming = existing.requestedChanges && typeof existing.requestedChanges === "object"
            ? existing.requestedChanges
            : {};
          const safePatch = Object.fromEntries(
            Object.entries(incoming).filter(([key]) => allowed.includes(key))
          );
          if (Object.keys(safePatch).length > 0) {
            await tx.venue.update({
              where: { id: existing.venueId },
              data: safePatch
            });
          }
        }
        if (existing.requestType === "ownership" && existing.targetType === ClaimTargetType.venue && existing.venueId) {
          const requester = await tx.user.findUnique({
            where: { id: existing.requestedById },
            select: { role: true }
          });

          if (requester?.role === "venue_manager") {
            await tx.venueManagerAccess.upsert({
              where: {
                userId_venueId: {
                  userId: existing.requestedById,
                  venueId: existing.venueId
                }
              },
              update: {},
              create: { userId: existing.requestedById, venueId: existing.venueId }
            });
          } else {
            await tx.producerVenueAccess.upsert({
              where: {
                producerId_venueId: {
                  producerId: existing.requestedById,
                  venueId: existing.venueId
                }
              },
              update: {},
              create: { producerId: existing.requestedById, venueId: existing.venueId }
            });
          }
        }
        if (existing.requestType === "ownership" && existing.targetType === ClaimTargetType.artist && existing.artistId) {
          const requester = await tx.user.findUnique({ where: { id: existing.requestedById }, select: { role: true } });
          await tx.artistAccess.upsert({
            where: { artistId_userId: { artistId: existing.artistId, userId: existing.requestedById } },
            update: { role: "owner", status: "active", acceptedAt: new Date() },
            create: { artistId: existing.artistId, userId: existing.requestedById, role: "owner", status: "active", acceptedAt: new Date(), invitedByUserId: req.user.id }
          });
          if (requester?.role === "producer") {
            await tx.producerArtistAccess.upsert({
              where: { producerId_artistId: { producerId: existing.requestedById, artistId: existing.artistId } },
              update: {},
              create: { producerId: existing.requestedById, artistId: existing.artistId }
            });
          }
          await tx.artist.update({ where: { id: existing.artistId }, data: { isVerified: true, verifiedAt: new Date(), verifiedByUserId: req.user.id } });
        }
        if (existing.requestType === "team_access" && existing.targetType === ClaimTargetType.artist && existing.artistId) {
          await tx.artistAccess.upsert({
            where: { artistId_userId: { artistId: existing.artistId, userId: existing.requestedById } },
            update: { role: "manager", status: "active", acceptedAt: new Date(), invitedByUserId: req.user.id },
            create: { artistId: existing.artistId, userId: existing.requestedById, role: "manager", status: "active", acceptedAt: new Date(), invitedByUserId: req.user.id }
          });
        }
      }

      return tx.claimRequest.update({
        where: { id: existing.id },
        data: {
          status: data.status,
          ...(includedArtistId ? { artistId: includedArtistId } : {}),
          decisionNote: data.decisionNote,
          reviewedById: req.user.id,
          reviewedAt: new Date()
        },
        include: {
          venue: true,
          artist: true,
          requestedBy: true,
          reviewedBy: true
        }
      });
    });

    await recordAuditEvent({ req, action: "claim.decided", subjectType: "claim", subjectId: updated.id, metadata: { status: updated.status, targetType: updated.targetType, requestType: updated.requestType, venueId: updated.venueId || null, artistId: updated.artistId || null } });

    res.json({ item: mapClaim(updated) });
  } catch (error) {
    next(error);
  }
}
