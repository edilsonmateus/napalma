export default function AdsPlacementMockup({ slot, imageUrl = "", title = "Seu anúncio", className = "" }) {
  return (
    <div className={`ads-slot-device ads-slot-device-${slot} ${className}`.trim()}>
      <div className="ads-slot-appbar"><i /> <strong>77gira</strong><em>•••</em></div>
      {slot === "explore_feed_large" ? <>
        <div className="ads-slot-placeholder-line" />
        <article className="ads-explore-preview-card">
          <div className="ads-explore-preview-image">{imageUrl ? <img src={imageUrl} alt="Prévia do criativo" /> : <span>Seu criativo</span>}<b>ADS</b></div>
          <div className="ads-explore-preview-copy"><strong>{title}</strong><small>Conteúdo patrocinado no Explorar</small><em>Ver destaque</em></div>
        </article>
        <div className="ads-slot-feed-lines"><i /><i /></div>
      </> : null}
      {slot === "venue_detail_inline" ? <>
        <div className="ads-slot-venue-hero" />
        <div className="ads-slot-feed-lines"><i /><i /></div>
        <div className="ads-slot-ad" style={{ aspectRatio: "29 / 12" }}>{imageUrl ? <img src={imageUrl} alt="Prévia do criativo" /> : <span>Seu criativo</span>}</div>
      </> : null}
      {slot === "radar_header" ? <>
        <div className="ads-slot-ad" style={{ aspectRatio: "290 / 129" }}>{imageUrl ? <img src={imageUrl} alt="Prévia do criativo" /> : <span>Seu criativo</span>}</div>
        <div className="ads-slot-radar-list"><i /><i /><i /></div>
      </> : null}
      {slot === "venue_menu_sponsor" ? <>
        <div className="ads-slot-menu-sponsor">{imageUrl ? <img src={imageUrl} alt="Prévia do criativo" /> : <span>Seu criativo</span>}</div>
        <div className="ads-slot-menu-lines"><i /><i /><i /></div>
      </> : null}
    </div>
  );
}
