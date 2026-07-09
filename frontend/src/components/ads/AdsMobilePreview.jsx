import { getAdsSlotSpec } from "../../config/adsSlots";

export function getAdsSlotPreviewCopy(slot) {
  return getAdsSlotSpec(slot);
}

export default function AdsMobilePreview({
  slot,
  imageUrl,
  title,
  altText,
  description,
  cta,
  campaignName,
  className = "",
  showMeta = true,
  compact = false
}) {
  const spec = getAdsSlotSpec(slot);
  const displayTitle = title || campaignName || "Título do anúncio";
  const displayDescription = description || spec.description;
  const displayCta = cta || spec.cta;
  const classes = [
    "ads-mobile-slot-preview",
    `ads-mobile-slot-preview-${spec.format}`,
    compact ? "ads-mobile-slot-preview-compact" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <article className={classes} data-ad-slot={slot || "generic"} data-ad-format={spec.format}>
      <div className="ads-mobile-frame">
        <div className="ads-mobile-topbar" />
        <div className="ads-mobile-content">
          <span>{spec.surface}</span>
          <div className="ads-mobile-ad-card" style={{ "--ads-preview-ratio": spec.aspectRatio }}>
            {imageUrl ? (
              <img src={imageUrl} alt={altText || displayTitle} style={{ objectFit: spec.imageFit }} />
            ) : (
              <div className="ads-mobile-image-placeholder">Criativo</div>
            )}
            <div>
              <strong>{displayTitle}</strong>
              <small>{displayDescription}</small>
              <em>{displayCta}</em>
            </div>
          </div>
          <p className="ads-mobile-preview-note">Prévia aproximada. Exibição final depende de revisão, créditos e inventário.</p>
        </div>
      </div>
      {showMeta ? (
        <p>
          {spec.label}
          <small>Proporção sugerida: {spec.ratio}</small>
        </p>
      ) : null}
    </article>
  );
}
