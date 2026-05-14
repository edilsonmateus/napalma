import { useMemo } from "react";
import { achievements, events } from "../data/mockData";
import { useUserStore } from "../store/userStore";

export default function HistoryPage() {
  const historyIds = useUserStore((state) => state.historyIds);
  const historyEvents = useMemo(() => events.filter((event) => historyIds.includes(event.id)), [historyIds]);

  return (
    <section>
      <header className="page-header">
        <h2>Meu Historico</h2>
      </header>

      <h3 className="section-title">Sambas que voce ja foi</h3>
      <ul className="history-list">
        {historyEvents.map((event) => (
          <li key={event.id}>{event.title} - {event.venue}</li>
        ))}
      </ul>

      <h3 className="section-title">Conquistas</h3>
      <ul className="history-list">
        {achievements.map((item) => (
          <li key={item.id}><strong>{item.name}</strong> - {item.description}</li>
        ))}
      </ul>
    </section>
  );
}
