export const ADS_SLOT_SPECS = {
  explore_feed_large: {
    surface: "Explorar",
    label: "Explorar · destaque",
    description: "Aparece no feed principal, entre casas e eventos recomendados.",
    cta: "Ver destaque",
    ratio: "16:6",
    aspectRatio: "16 / 6",
    format: "feed-hero",
    imageFit: "cover",
    placementHint: "Card largo, visual de descoberta, inspirado em anúncios nativos de feed."
  },
  venue_detail_inline: {
    surface: "Página da casa",
    label: "Página da casa",
    description: "Aparece como bloco contextual dentro da página de uma casa.",
    cta: "Conhecer",
    ratio: "16:5",
    aspectRatio: "16 / 5",
    format: "context-strip",
    imageFit: "cover",
    placementHint: "Faixa contextual mais discreta, sem competir com a informação da casa."
  },
  radar_header: {
    surface: "Meu Radar",
    label: "Radar",
    description: "Aparece como destaque compacto na área de planejamento do usuário.",
    cta: "Abrir",
    ratio: "16:5",
    aspectRatio: "16 / 5",
    format: "compact-reminder",
    imageFit: "cover",
    placementHint: "Peça compacta de lembrete, com leitura rápida e baixa fricção."
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
