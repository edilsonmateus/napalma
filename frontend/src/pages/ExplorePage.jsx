import { useMemo, useState } from "react";
import EventCard from "../components/events/EventCard";
import { useEventsQuery, useRegionsQuery } from "../hooks/useEventsQuery";

export default function ExplorePage() {
  const [region, setRegion] = useState("Todas");
  const { data: events = [], isLoading } = useEventsQuery();
  const { data: regions = [] } = useRegionsQuery();

  const filtered = useMemo(() => {
    if (region === "Todas") return events;
    return events.filter((item) => item.region === region);
  }, [region, events]);

  return (
    <section>
      <header className="page-header">
        <h1>NaPalma</h1>
        <p>O samba da sua cidade, na palma da sua mao</p>
      </header>

      <div className="chip-row">
        <button className={`chip ${region === "Todas" ? "active" : ""}`} onClick={() => setRegion("Todas")}>Todas</button>
        {regions.map((item) => (
          <button key={item} className={`chip ${region === item ? "active" : ""}`} onClick={() => setRegion(item)}>
            {item}
          </button>
        ))}
      </div>

      {isLoading ? <p className="empty">Carregando sambas...</p> : null}

      <div className="event-grid">
        {filtered.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
