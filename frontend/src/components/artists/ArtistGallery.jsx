import { ExternalLink, Play } from "lucide-react";

export default function ArtistGallery({ items = [], onMediaClick }) {
  if (!items.length) return null;
  const photos = items.filter((item) => item.type === "photo");
  const videos = items.filter((item) => item.type === "video_external");
  return (
    <section className="artist-epk-section artist-gallery-public">
      <h2>Fotos e vídeos</h2>
      {photos.length ? <div className="artist-gallery-photos">{photos.map((item) => <figure key={item.id}><img loading="lazy" src={item.url} alt={item.altText || item.title || "Foto do artista"}/>{item.caption ? <figcaption>{item.caption}</figcaption> : null}</figure>)}</div> : null}
      {videos.length ? <div className="artist-gallery-videos">{videos.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" onClick={() => onMediaClick?.(item)}>{item.thumbnailUrl ? <img loading="lazy" src={item.thumbnailUrl} alt=""/> : <span className="artist-gallery-play"><Play size={24}/></span>}<strong>{item.title || "Assistir vídeo"}</strong><ExternalLink size={14}/></a>)}</div> : null}
    </section>
  );
}
