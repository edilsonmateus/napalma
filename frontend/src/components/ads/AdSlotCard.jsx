import { useEffect, useRef } from "react";
import { getAdsSlotSpec } from "../../config/adsSlots";
import { getAdClickUrl, trackDeliveredImpression } from "../../services/events.service";

export default function AdSlotCard({ ad, slot, compact = false, venueId = null }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!ad || ad.isPlaceholder || !ad.deliveryToken || !cardRef.current || typeof IntersectionObserver === "undefined") return undefined;
    let timer = null;
    let reported = false;
    let visibleSince = 0;
    const clearTimer = () => { if (timer) window.clearTimeout(timer); timer = null; };
    const report = () => {
      if (reported || document.visibilityState !== "visible") return;
      reported = true;
      trackDeliveredImpression(ad.deliveryToken, {
        venueId,
        visibilityRatio: 0.5,
        viewedMs: Math.max(1000, Date.now() - visibleSince)
      }).catch(() => { reported = false; });
    };
    const observer = new IntersectionObserver(([entry]) => {
      clearTimer();
      if (!entry?.isIntersecting || entry.intersectionRatio < 0.5 || document.visibilityState !== "visible" || reported) return;
      visibleSince = Date.now();
      timer = window.setTimeout(report, 1000);
    }, { threshold: [0, 0.5, 1] });
    observer.observe(cardRef.current);
    const onVisibilityChange = () => { if (document.visibilityState !== "visible") clearTimer(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearTimer();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [ad?.deliveryToken, ad?.isPlaceholder, venueId]);

  if (!ad) return null;
  const isPlaceholder = Boolean(ad.isPlaceholder);
  const slotSpec = getAdsSlotSpec(slot);

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
    ref: cardRef,
    className: cardClassName,
    "data-ad-slot": slot,
    "data-ad-format": slotSpec.format
  };

  if (ad.destinationAvailable && ad.deliveryToken && !isPlaceholder) {
    return (
      <a href={getAdClickUrl(ad.deliveryToken)} target="_blank" rel="noreferrer" {...slotProps}>
        {content}
      </a>
    );
  }

  return <div {...slotProps}>{content}</div>;
}
