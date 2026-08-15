export const PRIVACY_POLICY_VERSION = "1.3";

// Consentimentos opcionais. Eles não condicionam o acesso normal ao 77Gira,
// nem substituem permissões técnicas do aparelho ou aceites jurídicos.
export const PRIVACY_CONSENT_CATALOG = Object.freeze([
  {
    purpose: "cultural_personalization",
    title: "Personalização cultural",
    detail: "Permite usar sinais gerais de navegação para organizar descobertas culturais mais próximas dos seus interesses.",
    effect: "Sem essa permissão, o app continua funcionando normalmente com descobertas gerais.",
    optional: true
  },
  {
    purpose: "ads_personalization",
    title: "Publicidade por região",
    detail: "Permite usar sua cidade-base para exibir campanhas regionais quando esse tipo de campanha existir.",
    effect: "Sem essa permissão, você ainda pode receber publicidade aprovada pelo 77Gira, mas sem uso da sua localização-base para segmentação.",
    optional: true
  }
]);
