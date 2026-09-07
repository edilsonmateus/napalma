import { z } from "zod";
import {
  initialVenueVisibilityFor,
  VENUE_CREATION_ORIGIN
} from "./venueVisibility.service.js";

const optionalUrl = z.preprocess(
  (value) => typeof value === "string" && !value.trim() ? undefined : value,
  z.string().trim().url().max(255).optional()
);

export const venueInclusionRequestedChangesSchema = z.object({
  venueName: z.string().trim().min(3).max(160),
  address: z.string().trim().min(5).max(255),
  neighborhood: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  description: z.string().trim().max(1200).optional(),
  instagramUrl: optionalUrl,
  requestedAccessProfile: z.enum(["producer", "venue_manager"]).default("venue_manager")
});

function normalizedText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function slugify(value) {
  return normalizedText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function venueInclusionIdentity(requestedChanges) {
  const requested = requestedChanges && typeof requestedChanges === "object" ? requestedChanges : {};
  return `${normalizedText(requested.venueName)}::${normalizedText(requested.city)}::${normalizedText(requested.state)}`;
}

function domainError(code, message, status = 409) {
  return Object.assign(new Error(code), { code, message, status });
}

export async function resolveVenueInclusion({ tx, claim, resolution, actorUserId }) {
  if (resolution?.mode === "existing") {
    const venue = await tx.venue.findUnique({
      where: { id: resolution.venueId },
      select: { id: true, name: true, visibilityStatus: true }
    });
    if (!venue) throw domainError("venue_not_found", "A casa escolhida não existe mais.", 404);
    return { venueId: venue.id, mode: "existing", venueCreated: false };
  }

  if (resolution?.mode !== "create_draft") {
    throw domainError(
      "venue_inclusion_resolution_required",
      "Escolha vincular a uma casa existente ou criar um novo rascunho interno.",
      400
    );
  }

  const parsed = venueInclusionRequestedChangesSchema.safeParse(claim.requestedChanges || {});
  if (!parsed.success) {
    throw domainError(
      "venue_inclusion_data_incomplete",
      "Os dados enviados para a inclusão da casa estão incompletos. Solicite a correção antes de aprovar.",
      400
    );
  }

  const requested = parsed.data;
  const duplicate = await tx.venue.findFirst({
    where: {
      name: { equals: requested.venueName, mode: "insensitive" },
      city: { equals: requested.city, mode: "insensitive" }
    },
    select: { id: true, name: true }
  });
  if (duplicate) {
    throw Object.assign(
      domainError(
        "venue_duplicate_detected",
        "Já existe uma casa com esse nome nesta cidade. Vincule a solicitação ao cadastro existente.",
        409
      ),
      { venue: duplicate }
    );
  }

  const baseSlug = slugify(requested.venueName) || "casa";
  const slugTaken = await tx.venue.findUnique({ where: { slug: baseSlug }, select: { id: true } });
  const slug = slugTaken ? `${baseSlug}-${claim.id.slice(0, 8)}` : baseSlug;
  const venue = await tx.venue.create({
    data: {
      name: requested.venueName,
      slug,
      description: requested.description || null,
      contactName: claim.responsibleName || null,
      contactPhone: claim.responsiblePhone || null,
      instagramUrl: requested.instagramUrl || null,
      address: requested.address,
      neighborhood: requested.neighborhood,
      region: requested.region,
      city: requested.city,
      state: requested.state,
      openDays: [],
      visibilityStatus: initialVenueVisibilityFor(VENUE_CREATION_ORIGIN.USER_INCLUSION),
      createdByUserId: actorUserId
    },
    select: { id: true, name: true, visibilityStatus: true }
  });

  return { venueId: venue.id, mode: "create_draft", venueCreated: true };
}
