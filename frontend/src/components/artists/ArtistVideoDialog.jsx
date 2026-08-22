import { useCallback, useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";

export default function ArtistVideoDialog({ item, meta, onClose, returnFocusRef }) {
  const closeButtonRef = useRef(null);

  const closeDialog = useCallback(() => {
    onClose();
    window.requestAnimationFrame(() => returnFocusRef?.current?.focus());
  }, [onClose, returnFocusRef]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeDialog();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeDialog]);

  return (
    <div className="artist-video-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
      <section className="artist-video-modal" role="dialog" aria-modal="true" aria-labelledby="artist-video-modal-title">
        <header className="artist-video-modal-header">
          <div>
            <div className="artist-video-modal-kicker-row">
              <span className="artist-video-modal-brand">77Play</span>
              <span className="artist-video-modal-provider">{meta.providerLabel}</span>
            </div>
            <h2 id="artist-video-modal-title">{item.title || "Assistir vídeo"}</h2>
          </div>
          <button ref={closeButtonRef} type="button" className="artist-video-modal-close" onClick={closeDialog} aria-label="Fechar vídeo">
            <X size={19} />
          </button>
        </header>
        <div className="artist-video-modal-player">
          <iframe
            src={meta.embedUrl}
            title={item.title || `Vídeo do ${meta.providerLabel}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <a href={item.url} target="_blank" rel="noreferrer" className="artist-video-modal-external">
          Abrir no {meta.providerLabel} <ExternalLink size={14} />
        </a>
      </section>
    </div>
  );
}
