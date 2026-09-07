function attachmentError(code, status, message) {
  return Object.assign(new Error(code), { code, status, publicMessage: message });
}

export async function validateVenueImageAssetForAttachment(db, {
  assetId,
  venueId = null,
  ownerUserId
}) {
  if (!assetId) return null;
  const asset = await db.venueImageAsset.findUnique({ where: { id: assetId } });
  if (!asset) {
    throw attachmentError("venue_image_asset_not_found", 404, "A imagem preparada não foi encontrada.");
  }
  if (asset.ownerUserId !== ownerUserId) {
    throw attachmentError("venue_image_asset_owner_mismatch", 403, "Esta imagem pertence a outro usuário.");
  }
  if (asset.status !== "draft") {
    throw attachmentError("venue_image_asset_unavailable", 409, "Esta imagem já foi utilizada ou não está mais disponível.");
  }
  if (asset.expiresAt && asset.expiresAt <= new Date()) {
    throw attachmentError("venue_image_asset_expired", 410, "Esta imagem preparada expirou. Selecione o arquivo novamente.");
  }
  if (asset.venueId && venueId && asset.venueId !== venueId) {
    throw attachmentError("venue_image_asset_venue_mismatch", 403, "Esta imagem foi preparada para outra casa.");
  }
  return asset;
}

export function venueImageDataFromAsset(asset) {
  return {
    activeImageAssetId: asset.id,
    bannerImageUrl: asset.bannerUrl,
    bannerImageMediumUrl: asset.bannerMediumUrl,
    bannerImageSmallUrl: asset.bannerSmallUrl,
    thumbnailImageUrl: asset.thumbnailUrl,
    thumbnailImageSmallUrl: asset.thumbnailSmallUrl
  };
}

export async function attachVenueImageAsset({ tx, assetId, venueId, ownerUserId }) {
  if (!assetId) return null;
  const asset = await validateVenueImageAssetForAttachment(tx, { assetId, venueId, ownerUserId });
  await tx.venue.update({ where: { id: venueId }, data: venueImageDataFromAsset(asset) });
  await tx.venueImageAsset.update({
    where: { id: asset.id },
    data: { venueId, status: "attached", attachedAt: new Date(), expiresAt: null }
  });
  return asset;
}

export async function rejectVenueImageAsset({ tx, assetId, ownerUserId }) {
  if (!assetId) return null;
  const asset = await tx.venueImageAsset.findUnique({ where: { id: assetId } });
  if (!asset) return null;
  if (asset.ownerUserId !== ownerUserId) {
    throw attachmentError("venue_image_asset_owner_mismatch", 403, "Esta imagem pertence a outro usuário.");
  }
  if (asset.status !== "draft") return asset;
  return tx.venueImageAsset.update({
    where: { id: asset.id },
    data: { status: "rejected", rejectedAt: new Date() }
  });
}
