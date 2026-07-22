import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import VerifiedBadge from "../common/VerifiedBadge";
import { resolveMediaUrl } from "../../services/api";

export default function EventCard({ event }) {
  const imageUrl = resolveMediaUrl(event.posterImageUrl || event.imageUrl) || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1400&q=80";
  return (
    <Link to={`/events/${event.id}`} className="event-card">
      <div className="event-cover" style={{ backgroundImage: `url(${imageUrl})` }}>
        <span className="event-region"><MapPin size={14} /> {event.region}</span>
      </div>
      <div className="event-body">
        <h3 className="artist-inline-with-badge">
          <span>{event.title}</span>
          {event.artistVerified ? <VerifiedBadge className="artist-verified-dot" title="Artista verificado" /> : null}
        </h3>
        <small>{event.venue}</small>
      </div>
    </Link>
  );
}
