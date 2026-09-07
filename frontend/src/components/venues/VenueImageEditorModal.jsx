import { useEffect, useId, useRef, useState } from "react";

const INITIAL_CROP = Object.freeze({ x: 0.5, y: 0.5, zoom: 1 });

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function CropPreview({ aspect, crop, imageUrl, label, mode = "cover", onChange }) {
  const dragRef = useRef(null);

  function beginDrag(event) {
    if (mode !== "cover") return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      crop
    };
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || mode !== "cover") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - drag.clientX) / Math.max(bounds.width, 1);
    const dy = (event.clientY - drag.clientY) / Math.max(bounds.height, 1);
    onChange({
      ...crop,
      x: clamp(drag.crop.x - dx / crop.zoom, 0, 1),
      y: clamp(drag.crop.y - dy / crop.zoom, 0, 1)
    });
  }

  function endDrag(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  const focalStyle = {
    objectPosition: `${crop.x * 100}% ${crop.y * 100}%`,
    transform: `scale(${crop.zoom})`
  };

  return (
    <div className="venue-image-editor-preview-group">
      <strong>{label}</strong>
      <div
        className={`venue-image-crop-preview is-${mode}`}
        style={{ aspectRatio: aspect }}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label={`${label}. Arraste a imagem para ajustar o enquadramento.`}
      >
        {mode === "contain_blur" ? (
          <>
            <img className="venue-image-preview-blur" src={imageUrl} alt="" aria-hidden="true" />
            <img className="venue-image-preview-contain" src={imageUrl} alt="Prévia da imagem inteira" />
          </>
        ) : (
          <img className="venue-image-preview-cover" src={imageUrl} alt="Prévia do enquadramento" style={focalStyle} />
        )}
      </div>
      {mode === "cover" ? (
        <div className="venue-image-editor-controls">
          <label>
            Zoom
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={crop.zoom}
              onChange={(event) => onChange({ ...crop, zoom: Number(event.target.value) })}
            />
          </label>
          <button type="button" className="chip" onClick={() => onChange({ ...INITIAL_CROP })}>Redefinir</button>
        </div>
      ) : null}
    </div>
  );
}

export default function VenueImageEditorModal({ busy = false, error = "", file, info, onCancel, onConfirm }) {
  const titleId = useId();
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const [imageUrl, setImageUrl] = useState("");
  const [bannerMode, setBannerMode] = useState("cover");
  const [bannerCrop, setBannerCrop] = useState({ ...INITIAL_CROP });
  const [thumbnailCrop, setThumbnailCrop] = useState({ ...INITIAL_CROP });

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape" && !busy) onCancel();
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll("button:not(:disabled), input:not(:disabled)")];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  function submit(event) {
    event.preventDefault();
    onConfirm({ file, bannerMode, bannerCrop, thumbnailCrop });
  }

  return (
    <div className="modal-backdrop venue-image-editor-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}>
      <form ref={dialogRef} className="modal-card venue-image-editor-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={submit}>
        <div className="venue-image-editor-heading">
          <div>
            <h3 id={titleId}>Ajustar imagem da casa</h3>
            <p className="meta-line">Defina como a imagem aparecerá na capa e nas miniaturas.</p>
          </div>
          <button ref={closeButtonRef} type="button" className="chip" onClick={onCancel} disabled={busy} aria-label="Fechar editor">Fechar</button>
        </div>

        <div className="venue-image-editor-source">
          <strong>{info?.name || file?.name}</strong>
          {info ? <span>{info.width} × {info.height} px · {info.sizeLabel}</span> : null}
        </div>

        <fieldset className="venue-image-editor-mode">
          <legend>Como preencher o banner</legend>
          <label className={bannerMode === "cover" ? "is-selected" : ""}>
            <input type="radio" name="bannerMode" value="cover" checked={bannerMode === "cover"} onChange={() => setBannerMode("cover")} />
            <span><strong>Preencher o banner</strong><small>A imagem ocupa todo o espaço; as bordas podem ser cortadas.</small></span>
          </label>
          <label className={bannerMode === "contain_blur" ? "is-selected" : ""}>
            <input type="radio" name="bannerMode" value="contain_blur" checked={bannerMode === "contain_blur"} onChange={() => setBannerMode("contain_blur")} />
            <span><strong>Mostrar a imagem inteira</strong><small>Completa as laterais com um fundo suave.</small></span>
          </label>
        </fieldset>

        {imageUrl ? (
          <div className="venue-image-editor-previews">
            <CropPreview aspect="16 / 9" crop={bannerCrop} imageUrl={imageUrl} label="Capa 16:9" mode={bannerMode} onChange={setBannerCrop} />
            <CropPreview aspect="1 / 1" crop={thumbnailCrop} imageUrl={imageUrl} label="Miniatura 1:1" onChange={setThumbnailCrop} />
          </div>
        ) : null}

        <p className="meta-line">Dica: arraste a imagem dentro de cada quadro e use o zoom para destacar a área principal.</p>
        {error ? <p className="field-error" role="alert">{error}</p> : null}
        <div className="form-actions-inline venue-image-editor-actions">
          <button type="button" className="chip" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Preparando imagem..." : "Usar este enquadramento"}</button>
        </div>
      </form>
    </div>
  );
}
