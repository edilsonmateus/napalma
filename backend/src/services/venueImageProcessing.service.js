import sharp from "sharp";

export const VENUE_IMAGE_MAX_INPUT_PIXELS = 40_000_000;
export const VENUE_IMAGE_ALLOWED_FORMATS = Object.freeze(["jpeg", "png", "webp"]);
export const VENUE_IMAGE_VARIANTS = Object.freeze({
  banner: { width: 1600, height: 900 },
  bannerMedium: { width: 1200, height: 675 },
  bannerSmall: { width: 800, height: 450 },
  thumbnail: { width: 640, height: 640 },
  thumbnailSmall: { width: 256, height: 256 }
});

function processingError(code, message, status = 400) {
  return Object.assign(new Error(message), { code, status });
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeVenueImageCrop(value = {}) {
  return {
    x: clamp(Number(value.x ?? 0.5), 0, 1),
    y: clamp(Number(value.y ?? 0.5), 0, 1),
    zoom: clamp(Number(value.zoom ?? 1), 1, 3)
  };
}

export function calculateVenueImageExtract(sourceWidth, sourceHeight, targetWidth, targetHeight, cropValue) {
  const crop = normalizeVenueImageCrop(cropValue);
  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  let width = sourceWidth;
  let height = sourceHeight;

  if (sourceRatio > targetRatio) width = sourceHeight * targetRatio;
  else height = sourceWidth / targetRatio;

  width = Math.max(1, Math.round(width / crop.zoom));
  height = Math.max(1, Math.round(height / crop.zoom));

  const left = Math.round(clamp(crop.x * sourceWidth - width / 2, 0, sourceWidth - width));
  const top = Math.round(clamp(crop.y * sourceHeight - height / 2, 0, sourceHeight - height));
  return { left, top, width, height };
}

async function renderCover(sourceBuffer, sourceWidth, sourceHeight, target, crop) {
  const extract = calculateVenueImageExtract(sourceWidth, sourceHeight, target.width, target.height, crop);
  return sharp(sourceBuffer, { limitInputPixels: VENUE_IMAGE_MAX_INPUT_PIXELS })
    .extract(extract)
    .resize(target.width, target.height, { fit: "fill" })
    .webp({ quality: 84, effort: 4 })
    .toBuffer();
}

async function renderContainedBlur(sourceBuffer, target) {
  const [background, foreground] = await Promise.all([
    sharp(sourceBuffer, { limitInputPixels: VENUE_IMAGE_MAX_INPUT_PIXELS })
      .resize(target.width, target.height, { fit: "cover" })
      .blur(24)
      .modulate({ brightness: 0.68, saturation: 0.82 })
      .webp({ quality: 78, effort: 4 })
      .toBuffer(),
    sharp(sourceBuffer, { limitInputPixels: VENUE_IMAGE_MAX_INPUT_PIXELS })
      .resize(target.width, target.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 86, effort: 4 })
      .toBuffer()
  ]);

  return sharp(background)
    .composite([{ input: foreground, gravity: "centre" }])
    .webp({ quality: 84, effort: 4 })
    .toBuffer();
}

export async function processVenueImage({
  buffer,
  bannerMode = "cover",
  bannerCrop,
  thumbnailCrop
}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw processingError("invalid_image", "O arquivo de imagem está vazio ou inválido.");
  }

  let metadata;
  try {
    metadata = await sharp(buffer, {
      limitInputPixels: VENUE_IMAGE_MAX_INPUT_PIXELS,
      failOn: "error"
    }).metadata();
  } catch (_error) {
    throw processingError("invalid_image", "Não foi possível processar esta imagem.");
  }

  if (!VENUE_IMAGE_ALLOWED_FORMATS.includes(metadata.format)) {
    throw processingError("invalid_file_type", "Formato não aceito. Envie uma imagem JPG, PNG ou WebP.");
  }

  let normalized;
  let normalizedInfo;
  try {
    const result = await sharp(buffer, {
      limitInputPixels: VENUE_IMAGE_MAX_INPUT_PIXELS,
      failOn: "error"
    })
      .rotate()
      .webp({ quality: 90, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    normalized = result.data;
    normalizedInfo = result.info;
  } catch (_error) {
    throw processingError("invalid_image", "Não foi possível normalizar esta imagem.");
  }

  const renderBanner = (target) => bannerMode === "contain_blur"
    ? renderContainedBlur(normalized, target)
    : renderCover(normalized, normalizedInfo.width, normalizedInfo.height, target, bannerCrop);

  const [banner, bannerMedium, bannerSmall, thumbnail, thumbnailSmall] = await Promise.all([
    renderBanner(VENUE_IMAGE_VARIANTS.banner),
    renderBanner(VENUE_IMAGE_VARIANTS.bannerMedium),
    renderBanner(VENUE_IMAGE_VARIANTS.bannerSmall),
    renderCover(normalized, normalizedInfo.width, normalizedInfo.height, VENUE_IMAGE_VARIANTS.thumbnail, thumbnailCrop),
    renderCover(normalized, normalizedInfo.width, normalizedInfo.height, VENUE_IMAGE_VARIANTS.thumbnailSmall, thumbnailCrop)
  ]);

  const sourceMimeType = metadata.format === "jpeg" ? "image/jpeg" : `image/${metadata.format}`;
  return {
    source: {
      buffer: normalized,
      mimeType: "image/webp",
      extension: "webp",
      width: normalizedInfo.width,
      height: normalizedInfo.height,
      originalMimeType: sourceMimeType,
      originalSizeBytes: buffer.length
    },
    banner: { buffer: banner, ...VENUE_IMAGE_VARIANTS.banner },
    bannerMedium: { buffer: bannerMedium, ...VENUE_IMAGE_VARIANTS.bannerMedium },
    bannerSmall: { buffer: bannerSmall, ...VENUE_IMAGE_VARIANTS.bannerSmall },
    thumbnail: { buffer: thumbnail, ...VENUE_IMAGE_VARIANTS.thumbnail },
    thumbnailSmall: { buffer: thumbnailSmall, ...VENUE_IMAGE_VARIANTS.thumbnailSmall }
  };
}
