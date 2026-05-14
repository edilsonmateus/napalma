import { useMemo } from "react";
import { useEventsQuery } from "../hooks/useEventsQuery";
import { useUserStore } from "../store/userStore";
import EventCard from "../components/events/EventCard";

export default function RadarPage() {
  const radarIds = useUserStore((state) => state.radarIds);
  const { data: events = [], isLoading } = useEventsQuery();

  const radarEvents = useMemo(() => events.filter((event) => radarIds.includes(event.id)), [radarIds, events]);

  return (
    <section>
      <header className="page-header">
        <h2>Meu Radar</h2>
      </header>
      {isLoading ? <p className="empty">Carregando seu radar...</p> : null}
      {!isLoading && radarEvents.length === 0 ? <p className="empty">Nenhum samba marcado ainda.</p> : null}
      <div className="event-grid">
        {radarEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
