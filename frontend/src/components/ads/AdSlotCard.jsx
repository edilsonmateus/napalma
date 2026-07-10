import { useEffect } from "react";
import { getAdsSlotSpec } from "../../config/adsSlots";
import { trackAdClick, trackAdImpression } from "../../services/events.service";

function getSessionId() {
  const key = "napalma:ad-session";
  const current = localStorage.getItem(key);
  if (current) return current;
  const next = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, next);
  return next;
}

export default function AdSlotCard({ ad, slot, compact = false, venueId = null }) {
  if (!ad) return null;
  const sessionId = getSessionId();
  const isPlaceholder = Boolean(ad.isPlaceholder);
  const slotSpec = getAdsSlotSpec(slot);

  useEffect(() => {
    if (isPlaceholder) return;
    const payload = {
      campaignId: ad.campaignId,
      creativeId: ad.creativeId,
      slot,
      sessionId,
      venueId
    };
    trackAdImpression(payload).catch(() => {});
  }, [ad.campaignId, ad.creativeId, slot, sessionId, isPlaceholder, venueId]);

  function handleClick() {
    if (isPlaceholder) return;
    const payload = {
      campaignId: ad.campaignId,
      creativeId: ad.creativeId,
      slot,
      sessionId,
      venueId
    };
    trackAdClick(payload).catch(() => {});
  }

  function buildTrackedUrl(url) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("utm_source", "napalma");
      parsed.searchParams.set("utm_medium", "app");
      parsed.searchParams.set("utm_campaign", ad.campaignName || ad.campaignId);
      parsed.searchParams.set("utm_content", slot);
      return parsed.toString();
    } catch (_error) {
      return url;
    }
  }

  const content = (
    <>
      <div
        className={`ad-slot-media ad-slot-media-${slotSpec.format} ${compact ? "compact" : ""} ${isPlaceholder ? "placeholder" : ""}`}
        style={{ "--ad-slot-ratio": slotSpec.aspectRatio }}
      >
        {ad.imageUrl ? (
          <img src={ad.imageUrl} alt={ad.altText || ad.title || "Publicidade"} style={{ objectFit: slotSpec.imageFit }} />
        ) : null}
      </div>
      <div className="ad-slot-body">
        <small>{isPlaceholder ? "Espaço publicitário" : "Patrocinado"}</small>
        <strong>{ad.title || ad.campaignName}</strong>
        <span className="ad-slot-description">{ad.altText || "Conteúdo patrocinado no 77Gira"}</span>
        <em className="ad-slot-cta">{slotSpec.cta} <b>→</b></em>
        <i className="ad-slot-badge">ADS</i>
      </div>
    </>
  );

  const cardClassName = `ad-slot-card ad-slot-card-${slotSpec.format} ad-slot-card-${slot}`;
  const slotProps = {
    className: cardClassName,
    "data-ad-slot": slot,
    "data-ad-format": slotSpec.format
  };

  if (ad.destinationUrl && !isPlaceholder) {
    return (
      <a href={buildTrackedUrl(ad.destinationUrl)} onClick={handleClick} target="_blank" rel="noreferrer" {...slotProps}>
        {content}
      </a>
    );
  }

  return <div {...slotProps}>{content}</div>;
}
