export const VENUE_MENU_MAX_PRICE_CENTS = 10_000_000;

function compactPrice(value) {
  return String(value ?? "")
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/^R\$\s*/i, "")
    .replace(/\s+/g, "");
}

export function parseVenueMenuPriceToCents(value) {
  const compact = compactPrice(value);
  if (!compact) return null;

  let normalized = "";
  if (/^\d+(?:,\d{1,2})?$/.test(compact)) {
    normalized = compact.replace(",", ".");
  } else if (/^\d+(?:\.\d{1,2})?$/.test(compact)) {
    normalized = compact;
  } else if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(compact)) {
    normalized = compact.replaceAll(".", "").replace(",", ".");
  } else if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(compact)) {
    normalized = compact.replaceAll(",", "");
  } else {
    return Number.NaN;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return Number.NaN;
  return Math.round(parsed * 100);
}

export function venueMenuPriceError(value, priceMode) {
  if (["hidden", "consultation"].includes(priceMode)) return "";
  const priceCents = parseVenueMenuPriceToCents(value);
  if (priceCents === null) return "Informe o preço ou selecione Oculto ou Sob consulta.";
  if (Number.isNaN(priceCents)) return "Digite somente o valor, como 29 ou 29,50. O prefixo R$ também é aceito.";
  if (priceCents > VENUE_MENU_MAX_PRICE_CENTS) return "O preço máximo permitido é R$ 100.000,00.";
  return "";
}

export function normalizeVenueMenuPriceInput(value) {
  const priceCents = parseVenueMenuPriceToCents(value);
  if (priceCents === null || Number.isNaN(priceCents)) return String(value ?? "");
  if (priceCents % 100 === 0) return String(priceCents / 100);
  return (priceCents / 100).toFixed(2).replace(".", ",");
}
