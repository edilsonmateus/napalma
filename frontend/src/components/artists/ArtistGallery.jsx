import { useRef, useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import ArtistVideoDialog from "./ArtistVideoDialog";
import { getExternalVideoMeta, resolveExternalVideoThumbnail } from "../../utils/externalVideo";

export default function ArtistGallery({ items = [], onMediaClick }) {
  const [activeVideo, setActiveVideo] = useState(null);
  const triggerRef = useRef(null);
  if (!items.length) return null;
  const photos = items.filter((item) => item.type === "photo");
  const videos = items.filter((item) => item.type === "video_external");
  return (
    <section className="artist-epk-section artist-gallery-public">
      <h2>Fotos e vídeos</h2>
      {photos.length ? <div className="artist-gallery-photos">{photos.map((item) => <figure key={item.id}><img loading="lazy" src={item.url} alt={item.altText || item.title || "Foto do artista"}/>{item.caption ? <figcaption>{item.caption}</figcaption> : null}</figure>)}</div> : null}
      {videos.length ? (
        <div className="artist-gallery-videos">
          {videos.map((item) => {
            const meta = getExternalVideoMeta(item.url);
            const thumbnailUrl = resolveExternalVideoThumbnail(item);
            const content = <>
              <span className="artist-gallery-video-thumb">
                {thumbnailUrl ? <img loading="lazy" src={thumbnailUrl} alt="" /> : <span className="artist-gallery-play"><Play size={21} /></span>}
                {thumbnailUrl ? <span className="artist-gallery-video-overlay"><Play size={18} fill="currentColor" /></span> : null}
              </span>
              <span className="artist-gallery-video-copy">
                <strong>{item.title || "Assistir vídeo"}</strong>
                <small>{meta.providerLabel}</small>
              </span>
              {meta.playable ? <Play size={16} aria-hidden="true" /> : <ExternalLink size={14} aria-hidden="true" />}
            </>;

            if (!meta.playable) {
              return <a key={item.id} className="artist-gallery-video" href={item.url} target="_blank" rel="noreferrer" onClick={() => onMediaClick?.(item)}>{content}</a>;
            }

            return (
              <button
                key={item.id}
                type="button"
                className="artist-gallery-video"
                aria-label={`Assistir ${item.title || "vídeo externo"}`}
                onClick={(event) => {
                  triggerRef.current = event.currentTarget;
                  onMediaClick?.(item);
                  setActiveVideo({ item, meta });
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      ) : null}
      {activeVideo ? <ArtistVideoDialog item={activeVideo.item} meta={activeVideo.meta} onClose={() => setActiveVideo(null)} returnFocusRef={triggerRef} /> : null}
    </section>
  );
}
