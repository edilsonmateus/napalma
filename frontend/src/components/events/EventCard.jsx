import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

export default function EventCard({ event }) {
  return (
    <Link to={`/events/${event.id}`} className="event-card">
      <div className="event-cover" style={{ backgroundImage: `url(${event.imageUrl})` }}>
        <span className="event-region"><MapPin size={14} /> {event.region}</span>
      </div>
      <div className="event-body">
        <h3>{event.title}</h3>
        <p>{event.artist}</p>
        <small>{event.venue}</small>
      </div>
    </Link>
  );
}
