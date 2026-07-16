export const ADS_SLOT_SPECS = {
  explore_feed_large: {
    surface: "Explorar",
    label: "Explorar · destaque",
    description: "Aparece no feed principal, entre casas e eventos recomendados.",
    cta: "Ver destaque",
    ratio: "580:350",
    aspectRatio: "58 / 35",
    cardAspectRatio: "116 / 91",
    imageDimensions: "580 × 350 px",
    cardDimensions: "580 × 455 px",
    format: "feed-hero",
    imageFit: "cover",
    placementHint: "Card largo, visual de descoberta, inspirado em anúncios nativos de feed."
  },
  venue_detail_inline: {
    surface: "Página da casa",
    label: "Página da casa",
    description: "Aparece como bloco contextual dentro da página de uma casa.",
    cta: "Conhecer",
    ratio: "580:240",
    aspectRatio: "29 / 12",
    cardAspectRatio: "29 / 12",
    imageDimensions: "580 × 240 px",
    cardDimensions: "580 × 240 px",
    format: "context-strip",
    imageFit: "cover",
    placementHint: "Faixa contextual mais discreta, sem competir com a informação da casa."
  },
  radar_header: {
    surface: "Meu Radar",
    label: "Radar",
    description: "Aparece como destaque compacto na área de planejamento do usuário.",
    cta: "Abrir",
    ratio: "580:258",
    aspectRatio: "290 / 129",
    cardAspectRatio: "58 / 35",
    imageDimensions: "580 × 258 px",
    cardDimensions: "580 × 350 px",
    format: "compact-reminder",
    imageFit: "cover",
    placementHint: "Peça compacta de lembrete, com leitura rápida e baixa fricção."
  },
  venue_menu_sponsor: {
    surface: "Cardápio da casa",
    label: "Cardápio apresentado por",
    description: "Publicidade vertical antes dos itens do Cardápio Essencial.",
    cta: "Conhecer",
    ratio: "900:1200",
    aspectRatio: "3 / 4",
    cardAspectRatio: "3 / 4",
    imageDimensions: "900 x 1200 px",
    cardDimensions: "900 x 1200 px",
    format: "menu-sponsor",
    imageFit: "cover",
    placementHint: "Criativo vertical em largura controlada para preservar o acesso rápido ao cardápio."
  }
};

export const ADS_SLOT_IDS = Object.keys(ADS_SLOT_SPECS);

export function getAdsSlotSpec(slot) {
  return ADS_SLOT_SPECS[slot] || {
    surface: "77Gira",
    label: slot || "Slot publicitário",
    description: "Prévia aproximada do slot selecionado.",
    cta: "Abrir",
    ratio: "variável",
    aspectRatio: "16 / 6",
    format: "generic",
    imageFit: "cover",
    placementHint: "Slot publicitário 77Gira."
  };
}
