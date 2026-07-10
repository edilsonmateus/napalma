import { getAdsSlotSpec } from "../../config/adsSlots";

export function getAdsSlotPreviewCopy(slot) {
  return getAdsSlotSpec(slot);
}

function CreativeSurface({ slot, imageUrl, title, altText, description, cta, campaignName }) {
  const spec = getAdsSlotSpec(slot);
  const displayTitle = title || campaignName || "Seu anúncio";
  const displayDescription = description || "Conteúdo patrocinado no 77Gira";
  const displayCta = cta || spec.cta;
  const hasNativeCopy = slot !== "venue_detail_inline";

  return (
    <article className={`ads-native-preview-creative ads-native-preview-creative-${slot}`}>
      <div className="ads-native-preview-media">
        {imageUrl ? <img src={imageUrl} alt={altText || displayTitle} /> : <span>Seu criativo</span>}
      </div>
      {hasNativeCopy ? (
        <div className="ads-native-preview-copy">
          <strong>{displayTitle}</strong>
          <small>{displayDescription}</small>
          <em>{displayCta} <b>→</b></em>
          <i>ADS</i>
        </div>
      ) : null}
    </article>
  );
}

function ExploreTouchpoint(props) {
  return <>
    <header className="ads-admin-preview-explore-header"><strong>77gira</strong><span>Entrar no 77Gira</span></header>
    <div className="ads-admin-preview-filters"><i>SP</i><i>Filtros</i><i>Ao vivo</i></div>
    <p className="ads-admin-preview-section-title">Amanhã <small>4 sambas</small></p>
    <CreativeSurface slot="explore_feed_large" {...props} />
    <div className="ads-admin-preview-event"><div /><strong>Mada Gema</strong><small>Vila Madalena</small></div>
  </>;
}

function VenueTouchpoint(props) {
  return <>
    <div className="ads-admin-preview-venue-hero" />
    <strong className="ads-admin-preview-venue-name">Todos os Santos</strong>
    <span className="ads-admin-preview-venue-text">Agenda, informações e próximas atrações</span>
    <CreativeSurface slot="venue_detail_inline" {...props} />
    <p className="ads-admin-preview-section-title">Próximas atrações</p>
    <div className="ads-admin-preview-list-row" />
  </>;
}

function RadarTouchpoint(props) {
  return <>
    <header className="ads-admin-preview-radar-header"><strong>Meu Radar</strong><span>Sua lista de intenção</span></header>
    <div className="ads-admin-preview-radar-tabs"><i>Todos</i><i>Zona Oeste</i></div>
    <CreativeSurface slot="radar_header" {...props} />
    <div className="ads-admin-preview-radar-list"><i /><i /><i /></div>
  </>;
}

export default function AdsMobilePreview({ slot, imageUrl, title, altText, description, cta, campaignName, className = "", showMeta = true, compact = false }) {
  const spec = getAdsSlotSpec(slot);
  const classes = ["ads-mobile-slot-preview", `ads-mobile-slot-preview-${slot}`, compact ? "ads-mobile-slot-preview-compact" : "", className].filter(Boolean).join(" ");
  const props = { imageUrl, title, altText, description, cta, campaignName };

  return (
    <article className={classes} data-ad-slot={slot || "generic"}>
      <div className="ads-mobile-frame">
        <div className="ads-mobile-topbar" />
        <div className="ads-mobile-content">
          {slot === "venue_detail_inline" ? <VenueTouchpoint {...props} /> : null}
          {slot === "radar_header" ? <RadarTouchpoint {...props} /> : null}
          {slot !== "venue_detail_inline" && slot !== "radar_header" ? <ExploreTouchpoint {...props} /> : null}
        </div>
      </div>
      {showMeta ? <p>{spec.label}<small>Peça: {spec.imageDimensions} · touchpoint: {spec.cardDimensions}</small></p> : null}
    </article>
  );
}
