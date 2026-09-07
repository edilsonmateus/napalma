import { VENUE_IMAGE_ACCEPT_ATTRIBUTE } from "../../utils/venueImage";

export default function VenueImageUploadField({
  asset = null,
  disabled = false,
  error = "",
  info = null,
  onSelect
}) {
  return (
    <section className="venue-image-upload-field" aria-live="polite">
      <div className="venue-image-upload-copy">
        <strong>Imagem de capa da casa</strong>
        <p>
          Use preferencialmente uma imagem horizontal de <b>1600 × 900 px</b>, proporção <b>16:9</b>.
        </p>
        <small>Formatos aceitos: JPG, PNG ou WebP, com até 5 MB.</small>
      </div>
      <label className="venue-image-file-control">
        <span>{disabled ? "Enviando imagem..." : "Escolher imagem da casa"}</span>
        <input
          type="file"
          accept={VENUE_IMAGE_ACCEPT_ATTRIBUTE}
          onChange={onSelect}
          disabled={disabled}
        />
      </label>
      {info ? (
        <div className={`venue-image-file-info${info.lowResolution ? " is-warning" : ""}`}>
          <strong>{info.name}</strong>
          <span>{info.width} × {info.height} px · {info.sizeLabel}</span>
          {info.warning ? <small>{info.warning}</small> : null}
        </div>
      ) : null}
      {asset ? (
        <div className="venue-image-asset-ready">
          <img src={asset.thumbnailSmallUrl || asset.thumbnailUrl || asset.bannerSmallUrl || asset.bannerUrl} alt="Prévia preparada da casa" />
          <span>
            <strong>Enquadramento preparado</strong>
            <small>Ele será aplicado quando você salvar ou enviar a alteração.</small>
          </span>
        </div>
      ) : null}
      {error ? <p className="field-error venue-image-upload-error" role="alert">{error}</p> : null}
    </section>
  );
}
