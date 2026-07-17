import sharp from "sharp";
import { z } from "zod";
import { AD_PLACEMENTS } from "../config/adPlacements.js";
import { prisma } from "../lib/prisma.js";
import { uploadCreativeToR2 } from "../services/r2Storage.service.js";

const uploadSchema = z.object({
  campaignId: z.string().uuid(),
  slot: z.enum(["explore_feed_large", "venue_detail_inline", "radar_header", "venue_menu_sponsor"])
});
const FORMAT_TO_MIME = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const FORMAT_TO_EXTENSION = { jpeg: "jpg", png: "png", webp: "webp" };

export async function uploadAdCreativeAsset(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "file_required", message: "Selecione uma imagem para upload." });
    }
    const { campaignId, slot } = uploadSchema.parse(req.body);
    const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId }, select: { id: true } });
    if (!campaign) {
      return res.status(404).json({ error: "campaign_not_found", message: "Campanha nao encontrada." });
    }

    let metadata;
    try {
      metadata = await sharp(req.file.buffer).metadata();
    } catch (_error) {
      return res.status(400).json({ error: "invalid_image", message: "Arquivo de imagem invalido." });
    }
    const mimeType = FORMAT_TO_MIME[metadata.format];
    const placement = AD_PLACEMENTS.find((item) => item.legacySlot === slot);
    if (!mimeType || !placement.allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({ error: "invalid_file_type", message: "Formato invalido. Use JPG, PNG ou WebP." });
    }
    if (!metadata.width || !metadata.height) {
      return res.status(400).json({ error: "invalid_dimensions", message: "Nao foi possivel validar as dimensoes." });
    }
    const expectedRatio = placement.recommendedWidth / placement.recommendedHeight;
    const actualRatio = metadata.width / metadata.height;
    if (Math.abs(actualRatio - expectedRatio) / expectedRatio > 0.12) {
      const imageDimensions = `${placement.recommendedWidth} x ${placement.recommendedHeight}`;
      const cardContext = placement.renderedCardDimensions !== imageDimensions
        ? ` O card completo no app mede ${placement.renderedCardDimensions} e inclui copy nativo do 77Gira.`
        : "";
      return res.status(400).json({
        error: "invalid_aspect_ratio",
        message: `Proporcao invalida para ${slot}. Envie uma imagem ${imageDimensions}, na proporcao ${placement.aspectRatio}.${cardContext}`
      });
    }

    const uploaded = await uploadCreativeToR2({
      buffer: req.file.buffer,
      mimeType,
      extension: FORMAT_TO_EXTENSION[metadata.format],
      campaignId
    });
    return res.status(201).json({ item: { ...uploaded, width: metadata.width, height: metadata.height, slot } });
  } catch (error) {
    if (error?.code === "r2_not_configured") {
      return res.status(503).json({ error: error.code, message: error.message });
    }
    return next(error);
  }
}
