import { useEffect } from "react";
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
      <div className={`ad-slot-media ${compact ? "compact" : ""} ${isPlaceholder ? "placeholder" : ""}`}>
        {ad.imageUrl ? <img src={ad.imageUrl} alt={ad.altText || ad.title || "Publicidade"} /> : null}
      </div>
      <div className="ad-slot-body">
        <small>{isPlaceholder ? "Espaco Publicitario" : "Patrocinado"}</small>
        <strong>{ad.title || ad.campaignName}</strong>
      </div>
    </>
  );

  if (ad.destinationUrl && !isPlaceholder) {
    return (
      <a href={buildTrackedUrl(ad.destinationUrl)} onClick={handleClick} target="_blank" rel="noreferrer" className="ad-slot-card">
        {content}
      </a>
    );
  }

  return <div className="ad-slot-card">{content}</div>;
}
