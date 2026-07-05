import { Link } from "react-router-dom";
import VerifiedBadge from "../common/VerifiedBadge";

export default function RelatedArtists({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="artist-related artist-epk-section">
      <h2>Artistas da mesma roda</h2>
      <div className="artist-related-grid">
        {items.map((artist) => (
          <Link className="clean-card artist-related-card" to={`/artistas/${artist.slug || artist.id}`} key={artist.id}>
            {artist.imageUrl ? <img src={artist.imageUrl} alt="" loading="lazy" /> : <span className="artist-related-avatar" aria-hidden="true" />}
            <span><strong>{artist.name}{artist.isVerified ? <VerifiedBadge title="Artista verificado" /> : null}</strong><small>{(artist.genres || []).slice(0, 2).join(" · ")}</small></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
