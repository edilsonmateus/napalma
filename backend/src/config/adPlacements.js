import { AdSlot } from "@prisma/client";

const FIVE_MB = 5 * 1024 * 1024;
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const AD_PLACEMENTS = Object.freeze([
  {
    key: "explore_feed_large",
    legacySlot: AdSlot.explore_feed_large,
    name: "Explorar - Card Grande",
    description: "Card publicitario inserido no feed principal de descoberta.",
    channel: "app",
    page: "explore",
    surface: "feed",
    format: "display_image",
    // A imagem é a área de foto; o copy nativo completa o card 580 x 455.
    recommendedWidth: 580,
    recommendedHeight: 350,
    aspectRatio: "58:35",
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxFileSizeBytes: FIVE_MB,
    isMobileEnabled: true,
    isDesktopEnabled: true,
    isActive: true,
    isCommerciallyAvailable: false,
    requiresApproval: true,
    supportsTargeting: true,
    supportsFrequencyCap: true,
    inventory: { dailyImpressionCap: 1200, maxAdsPerPage: 1 },
    commercialRules: { purchaseEnabled: false, pricingConfigured: false, billingMode: "valid_impression" }
  },
  {
    key: "venue_detail_inline",
    legacySlot: AdSlot.venue_detail_inline,
    name: "Detalhe da Casa - Inline",
    description: "Faixa publicitaria contextual exibida no detalhe de uma casa.",
    channel: "app",
    page: "venue_detail",
    surface: "inline",
    format: "display_image",
    recommendedWidth: 580,
    recommendedHeight: 240,
    aspectRatio: "29:12",
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxFileSizeBytes: FIVE_MB,
    isMobileEnabled: true,
    isDesktopEnabled: true,
    isActive: true,
    isCommerciallyAvailable: false,
    requiresApproval: true,
    supportsTargeting: true,
    supportsFrequencyCap: true,
    inventory: { dailyImpressionCap: 700, maxAdsPerPage: 1 },
    commercialRules: { purchaseEnabled: false, pricingConfigured: false, billingMode: "valid_impression" }
  },
  {
    key: "radar_header",
    legacySlot: AdSlot.radar_header,
    name: "Meu Radar - Topo",
    description: "Faixa publicitaria exibida no cabecalho do Meu Radar.",
    channel: "app",
    page: "radar",
    surface: "header",
    format: "display_image",
    // A imagem é a área de foto; o texto nativo completa o card 580 x 350.
    recommendedWidth: 580,
    recommendedHeight: 258,
    aspectRatio: "290:129",
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxFileSizeBytes: FIVE_MB,
    isMobileEnabled: true,
    isDesktopEnabled: true,
    isActive: true,
    isCommerciallyAvailable: false,
    requiresApproval: true,
    supportsTargeting: true,
    supportsFrequencyCap: true,
    inventory: { dailyImpressionCap: 900, maxAdsPerPage: 1 },
    commercialRules: { purchaseEnabled: false, pricingConfigured: false, billingMode: "valid_impression" }
  }
]);
