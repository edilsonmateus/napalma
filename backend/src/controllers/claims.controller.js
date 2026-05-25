import { ClaimStatus, ClaimTargetType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const createClaimSchema = z
  .object({
    targetType: z.enum(["venue", "artist"]),
    requestType: z.enum(["ownership", "venue_update"]).optional().default("ownership"),
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
    requestedChanges: z.record(z.any()).optional()
  })
  .superRefine((data, ctx) => {
    if (data.targetType === "venue" && !data.venueId) {
      ctx.addIssue({ code: "custom", path: ["venueId"], message: "Informe a casa para reivindicacao." });
    }
    if (data.targetType === "artist" && !data.artistId) {
      ctx.addIssue({ code: "custom", path: ["artistId"], message: "Informe o artista para reivindicacao." });
    }
    if (data.requestType === "ownership") {
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

function mapClaim(claim) {
  return {
    id: claim.id,
    targetType: claim.targetType,
    status: claim.status,
    requestType: claim.requestType || "ownership",
    justification: claim.justification ?? "",
    requestedChanges: claim.requestedChanges ?? null,
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

export async function createClaimRequest(req, res, next) {
  try {
    const isProducer = req.user?.role === "producer";
    const isHouse = req.user?.role === "venue_manager";
    if (!isProducer && !isHouse) {
      return res.status(403).json({
        error: "forbidden",
        message: "Somente produtor ou casa podem abrir reivindicacoes."
      });
    }
    const data = createClaimSchema.parse(req.body);

    if (isHouse && data.targetType !== ClaimTargetType.venue) {
      return res.status(403).json({
        error: "forbidden",
        message: "Perfil casa pode reivindicar somente casas."
      });
    }

    if (data.targetType === ClaimTargetType.venue) {
      const venue = await prisma.venue.findUnique({ where: { id: data.venueId }, select: { id: true } });
      if (!venue) return res.status(404).json({ error: "venue_not_found", message: "Casa nao encontrada." });
    }
    if (data.targetType === ClaimTargetType.artist) {
      const artist = await prisma.artist.findUnique({ where: { id: data.artistId }, select: { id: true } });
      if (!artist) return res.status(404).json({ error: "artist_not_found", message: "Artista nao encontrado." });
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
      if (data.status === ClaimStatus.approved) {
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
          await tx.producerArtistAccess.upsert({
            where: {
              producerId_artistId: {
                producerId: existing.requestedById,
                artistId: existing.artistId
              }
            },
            update: {},
            create: { producerId: existing.requestedById, artistId: existing.artistId }
          });
        }
      }

      return tx.claimRequest.update({
        where: { id: existing.id },
        data: {
          status: data.status,
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

    res.json({ item: mapClaim(updated) });
  } catch (error) {
    next(error);
  }
}
