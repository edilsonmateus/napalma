export const VENUE_IMAGE_ACCEPTED_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export const VENUE_IMAGE_ACCEPT_ATTRIBUTE = VENUE_IMAGE_ACCEPTED_MIME_TYPES.join(",");
export const VENUE_IMAGE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const VENUE_IMAGE_RECOMMENDED_WIDTH = 1600;
export const VENUE_IMAGE_RECOMMENDED_HEIGHT = 900;
export const VENUE_IMAGE_MIN_RECOMMENDED_WIDTH = 1200;
export const VENUE_IMAGE_MIN_RECOMMENDED_HEIGHT = 675;
export const VENUE_IMAGE_ASPECT_RATIO_LABEL = "16:9";

export function formatVenueImageFileSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function validateVenueImageFileBasics(file) {
  if (!file) return { ok: false, message: "Selecione uma imagem." };
  if (!VENUE_IMAGE_ACCEPTED_MIME_TYPES.includes(file.type)) {
    return {
      ok: false,
      message: "Formato não aceito. Envie uma imagem JPG, PNG ou WebP."
    };
  }
  if (file.size <= 0) return { ok: false, message: "O arquivo selecionado está vazio." };
  if (file.size > VENUE_IMAGE_MAX_FILE_SIZE_BYTES) {
    return { ok: false, message: "A imagem deve ter no máximo 5 MB." };
  }
  return { ok: true };
}

function dimensionsFromImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("invalid_image"));
    };
    image.src = objectUrl;
  });
}

export async function inspectVenueImageFile(file) {
  const basic = validateVenueImageFileBasics(file);
  if (!basic.ok) throw Object.assign(new Error(basic.message), { code: "invalid_venue_image" });

  let dimensions;
  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close?.();
    } else {
      dimensions = await dimensionsFromImageElement(file);
    }
  } catch (_error) {
    throw Object.assign(
      new Error("Não foi possível abrir esta imagem. Confira se o arquivo é um JPG, PNG ou WebP válido."),
      { code: "invalid_venue_image" }
    );
  }

  if (!dimensions.width || !dimensions.height) {
    throw Object.assign(new Error("A imagem selecionada não possui dimensões válidas."), { code: "invalid_venue_image" });
  }

  const lowResolution =
    dimensions.width < VENUE_IMAGE_MIN_RECOMMENDED_WIDTH ||
    dimensions.height < VENUE_IMAGE_MIN_RECOMMENDED_HEIGHT;

  return {
    name: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    sizeLabel: formatVenueImageFileSize(file.size),
    width: dimensions.width,
    height: dimensions.height,
    lowResolution,
    warning: lowResolution
      ? "Esta imagem pode perder nitidez. Recomendamos pelo menos 1200 × 675 px."
      : ""
  };
}
