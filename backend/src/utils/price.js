function formatCurrencyValue(value) {
  if (value == null || Number.isNaN(Number(value))) return "";
  const normalized = Number(value);
  if (Number.isInteger(normalized)) return String(normalized);
  return normalized.toFixed(2).replace(".", ",");
}

export function formatPriceLabel(priceMin, priceMax, ticketType) {
  if (ticketType === "free") return "Gratuito";
  if (ticketType === "consumacao") return "Consumacao";
  if (priceMin == null && priceMax == null) return "Consulte valores";
  if (priceMin != null && priceMax != null && Number(priceMin) !== Number(priceMax)) {
    return `R$ ${formatCurrencyValue(priceMin)} - R$ ${formatCurrencyValue(priceMax)}`;
  }
  const value = priceMin ?? priceMax;
  return `R$ ${formatCurrencyValue(value)}`;
}

export function formatPriceSecondaryLabel(event) {
  const parts = [];
  if (event.ticketType === "consumacao" && event.consumacaoValue != null) {
    parts.push(`Cons. min R$ ${formatCurrencyValue(event.consumacaoValue)}`);
  }
  if (event.couvertArtistico != null) {
    parts.push(`Couvert R$ ${formatCurrencyValue(event.couvertArtistico)}`);
  }
  return parts.join(" | ");
}
