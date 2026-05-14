import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarClock, MapPin, Star } from "lucide-react";
import { useEventsQuery } from "../hooks/useEventsQuery";
import { useUserStore } from "../store/userStore";

export default function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const toggleRadar = useUserStore((state) => state.toggleRadar);
  const radarIds = useUserStore((state) => state.radarIds);
  const { data: events = [], isLoading } = useEventsQuery();

  const event = useMemo(() => events.find((item) => item.id === eventId), [eventId, events]);

  if (isLoading) {
    return <p className="empty">Carregando evento...</p>;
  }

  if (!event) {
    return <p>Evento nao encontrado.</p>;
  }

  const marked = radarIds.includes(event.id);

  return (
    <section>
      <button className="btn-link" onClick={() => navigate(-1)}>Voltar</button>
      <div className="event-detail-cover" style={{ backgroundImage: `url(${event.imageUrl})` }} />
      <h2>{event.title}</h2>
      <p>{event.artist}</p>
      <div className="meta-line"><MapPin size={14} /> {event.venue} - {event.region}</div>
      <div className="meta-line"><CalendarClock size={14} /> {new Date(event.startsAt).toLocaleString("pt-BR")}</div>
      <button className="btn-primary" onClick={() => toggleRadar(event.id)}>
        <Star size={14} /> {marked ? "Marcado no seu Radar" : "Acho que eu vou"}
      </button>
    </section>
  );
}
