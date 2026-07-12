import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useCreatePelaHoraMutation,
  useDeletePelaHoraMutation,
  useEventsQuery,
  useMyPelaHoraQuery,
  usePelaHoraSuggestionQuery
} from "../hooks/useEventsQuery";
import { useAuthStore } from "../store/authStore";
import VerifiedBadge from "../components/common/VerifiedBadge";
import { getAudienceBadges } from "../utils/eventAudienceBadges";
import { buildGoogleMapsLink, buildUberLink, buildWazeLink } from "../utils/maps";
import mapsIcon from "../assets/routes/maps.svg";
import wazeIcon from "../assets/routes/waze.svg";
import uberIcon from "../assets/routes/uber.svg";
import AppToast from "../components/common/AppToast";

function toDateInput(value) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatHour(value) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLong(value) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

function estimateTransitMinutes(prevRegion, nextRegion) {
  if (!prevRegion || !nextRegion) return 35;
  return prevRegion === nextRegion ? 25 : 55;
}

function riskCopy(riskScore) {
  if (riskScore <= 1) return "Suave. Dá pra curtir sem correria.";
  if (riskScore <= 3) return "Vai rolar, mas sem vacilar no deslocamento.";
  return "Roteiro raiz: chance alta de correria entre sambas.";
}

function riskTone(riskLevel) {
  if (riskLevel === "ok") return "live-status-live";
  if (riskLevel === "tight") return "live-status-soon";
  return "live-status-ended";
}

function riskSummary(riskScore) {
  if (riskScore <= 1) return "Risco baixo";
  if (riskScore <= 3) return "Risco moderado";
  return "Risco alto";
}

function RouteActions({ item }) {
  return (
    <div className="pela-hora-route-actions" aria-label={`Rotas para ${item.title}`}>
      <a href={buildGoogleMapsLink(item)} target="_blank" rel="noreferrer" className="saved-route-chip" aria-label={`Abrir rota no Maps para ${item.title}`} title="Maps">
        <img src={mapsIcon} alt="" aria-hidden="true" className="route-icon-img route-icon-img-maps" />
      </a>
      <a href={buildWazeLink(item)} target="_blank" rel="noreferrer" className="saved-route-chip" aria-label={`Abrir rota no Waze para ${item.title}`} title="Waze">
        <img src={wazeIcon} alt="" aria-hidden="true" className="route-icon-img route-icon-img-waze" />
      </a>
      <a href={buildUberLink(item)} target="_blank" rel="noreferrer" className="saved-route-chip" aria-label={`Abrir rota no Uber para ${item.title}`} title="Uber">
        <img src={uberIcon} alt="" aria-hidden="true" className="route-icon-img route-icon-img-uber" />
      </a>
    </div>
  );
}

function PelaHoraTimeline({
  items,
  statusLabel = "Selecionado",
  withRoutes = false,
  attendedMap = {},
  onToggleAttended
}) {
  return (
    <div className={`pela-hora-timeline ${withRoutes ? "is-saved" : ""}`}>
      {items.map((item, idx) => {
        const nextTransit = items[idx + 1]?.transitMinutesFromPrev || 0;
        const attended = Boolean(attendedMap[item.id]);
        return (
          <div key={item.id || item.eventId} className="pela-hora-timeline-row">
            <time className="pela-hora-timeline-time">{formatHour(item.startsAt)}</time>
            <div className="pela-hora-timeline-track" aria-hidden="true">
              <span className={`pela-hora-timeline-dot ${idx === 0 ? "start" : ""} ${idx === items.length - 1 ? "end" : ""}`} />
              {idx < items.length - 1 ? <span className="pela-hora-timeline-line" /> : null}
            </div>
            <div className="pela-hora-timeline-content">
              <strong>{item.title}</strong>
              <span>{item.venue}{item.region ? ` · ${item.region}` : ""}</span>
              {withRoutes ? (
                <div className="pela-hora-timeline-utilities">
                  <RouteActions item={item} />
                  <button
                    type="button"
                    className={`pela-hora-attended-btn ${attended ? "active" : ""}`}
                    onClick={() => onToggleAttended(item.id)}
                  >
                    {attended ? "Eu fui" : "Marcar presença"}
                  </button>
                </div>
              ) : null}
              {idx < items.length - 1 && nextTransit > 0 ? (
                <span className="pela-hora-transit-note" aria-label={`${nextTransit} minutos de deslocamento`}>
                  <span aria-hidden="true">⌁</span> {nextTransit} min
                </span>
              ) : null}
            </div>
            <small className={`pela-hora-timeline-status ${attended ? "is-attended" : ""}`}>
              {attended ? "Confirmado" : statusLabel}
            </small>
          </div>
        );
      })}
    </div>
  );
}

export default function PelaHoraPage() {
  const user = useAuthStore((state) => state.user);
  const [date, setDate] = useState(toDateInput(new Date()));
  const [title, setTitle] = useState("Plano do Dia");
  const [mode, setMode] = useState("manual");
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [toast, setToast] = useState({ text: "", type: "info" });
  const [attendedMap, setAttendedMap] = useState({});

  const { data: events = [], isLoading: eventsLoading } = useEventsQuery();
  const { data: itineraries = [], isLoading: itinerariesLoading } = useMyPelaHoraQuery(Boolean(user));
  const { data: suggestion, isLoading: suggestionLoading } = usePelaHoraSuggestionQuery(
    { date, limit: 3 },
    Boolean(user && mode === "automatic")
  );
  const createPelaHora = useCreatePelaHoraMutation();
  const deletePelaHora = useDeletePelaHoraMutation();

  const filteredByDate = useMemo(() => {
    return events.filter((event) => toDateInput(event.startsAt) === date);
  }, [events, date]);

  const selectedEvents = useMemo(
    () => filteredByDate.filter((event) => selectedEventIds.includes(event.id)),
    [filteredByDate, selectedEventIds]
  );
  const selectedTimeline = useMemo(() => {
    const sorted = [...selectedEvents].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    let totalTransit = 0;
    let riskScore = 0;
    const items = sorted.map((event, idx) => {
      if (idx === 0) return { ...event, transitMinutesFromPrev: 0, riskLevel: "ok" };
      const prev = sorted[idx - 1];
      const transit = estimateTransitMinutes(prev.region, event.region);
      const gapMin = Math.floor((new Date(event.startsAt).getTime() - new Date(prev.endsAt).getTime()) / 60000);
      const remaining = gapMin - transit;
      const riskLevel = remaining >= 25 ? "ok" : remaining >= 0 ? "tight" : "risky";
      totalTransit += transit;
      riskScore += riskLevel === "ok" ? 0 : riskLevel === "tight" ? 1 : 2;
      return { ...event, transitMinutesFromPrev: transit, riskLevel };
    });
    return { items, totalTransit, riskScore };
  }, [selectedEvents]);

  function toggleEvent(id) {
    setSelectedEventIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAttended(itemId) {
    setAttendedMap((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  async function handleSave() {
    if (!user) return;
    const eventIds = mode === "automatic" ? (suggestion?.eventIds || []) : selectedEventIds;
    if (eventIds.length < 2) {
      setToast({ text: "Escolha pelo menos 2 sambas para montar seu Pela Hora.", type: "info" });
      return;
    }
    try {
      setToast({ text: "", type: "info" });
      await createPelaHora.mutateAsync({
        title,
        date,
        mode,
        eventIds
      });
      setToast({ text: "Pela Hora salvo com sucesso.", type: "success" });
      if (mode === "manual") setSelectedEventIds([]);
    } catch (_error) {
      setToast({ text: "Não foi possível salvar seu Pela Hora agora.", type: "error" });
    }
  }

  async function handleDeletePlan(id) {
    try {
      setToast({ text: "", type: "info" });
      await deletePelaHora.mutateAsync(id);
      setToast({ text: "Plano removido com sucesso.", type: "success" });
    } catch (_error) {
      setToast({ text: "Não foi possível remover esse plano agora.", type: "error" });
    }
  }

  return (
    <section className="screen screen-explore pela-hora-screen">
      <header className="page-header">
        <h2>Pela Hora</h2>
        <p>Monte seu plano do dia com 2 ou mais sambas, em ordem de horário. Eu sei que vai dar bololo.</p>
      </header>

      {!user ? (
        <div className="empty login-gate">
          <p>O Plano do Dia fica disponível quando você entra na conta.</p>
          <Link to="/settings" className="inline-login-cta">Entrar agora</Link>
        </div>
      ) : null}

      {user ? (
        <div className="venue-form pela-hora-setup">
          <h3 className="section-title">Passo 1 - Nome e data do plano</h3>
          <p className="pela-hora-step-help">Defina o plano e escolha como deseja montar seu roteiro.</p>
          <div className="pela-hora-plan-meta">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do plano" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="pela-hora-mode-actions">
            <button className={`pela-hora-action-btn ${mode === "manual" ? "active" : ""}`} type="button" onClick={() => setMode("manual")}>Escolher eu mesmo</button>
            <button className={`pela-hora-action-btn ${mode === "automatic" ? "active" : ""}`} type="button" onClick={() => setMode("automatic")}>Receber sugestão</button>
          </div>
        </div>
      ) : null}

      {user && mode === "manual" ? (
        <>
          <h3 className="section-title">Passo 2 - Escolha os eventos do seu plano</h3>
          <p className="pela-hora-step-help">Toque para adicionar ao roteiro. Toque novamente para remover.</p>
          {eventsLoading ? <p className="empty helper-empty">Carregando sambas...</p> : null}
          {filteredByDate.length === 0 ? (
            <div className="empty helper-empty">
              <p>Sem sambas nessa data.</p>
              <small className="meta-line">Tente outra data ou use a sugestão automática.</small>
            </div>
          ) : null}
          <div className="venue-list pela-hora-event-list">
            {filteredByDate.map((event) => (
              <button key={event.id} type="button" className={`venue-card ${selectedEventIds.includes(event.id) ? "active-card" : ""}`} onClick={() => toggleEvent(event.id)}>
                <div>
                  <h3 className="artist-inline-with-badge">
                    <span>{event.title}</span>
                    {event.artistVerified ? <VerifiedBadge className="artist-verified-dot" title="Artista verificado" /> : null}
                  </h3>
                  <p className="meta-line">{event.venue} - {event.region}</p>
                  {getAudienceBadges(event).length > 0 ? (
                    <div className="event-audience-row">
                      {getAudienceBadges(event).map((badge) => (
                        <span key={badge} className="event-audience-badge">{badge}</span>
                      ))}
                    </div>
                  ) : null}
                  {selectedEventIds.includes(event.id) ? (
                    <small className="meta-line added-flag">
                      Adicionado ao plano
                      {" "}
                      <span className="added-remove-link">Remover</span>
                    </small>
                  ) : null}
                </div>
                <div className="event-select-actions">
                  <small className="meta-line">{formatDateTime(event.startsAt)}</small>
                  {selectedEventIds.includes(event.id) ? <span className="selected-check">✓</span> : null}
                </div>
              </button>
            ))}
          </div>
          {selectedTimeline.items.length > 0 ? (
            <div className="clean-card schedule-card">
              <h4>Programação</h4>
              <p className="meta-line">
                {selectedTimeline.items.length} {selectedTimeline.items.length === 1 ? "samba" : "sambas"} | deslocamento estimado {selectedTimeline.totalTransit} min
              </p>
              <p className="meta-line">{riskCopy(selectedTimeline.riskScore)}</p>
              <PelaHoraTimeline items={selectedTimeline.items} />
            </div>
          ) : null}
        </>
      ) : null}

      {user && mode === "automatic" ? (
        <>
          <h3 className="section-title">Sugestão automática de plano</h3>
          {suggestionLoading ? <p className="empty helper-empty">Gerando seu Pela Hora...</p> : null}
          {!suggestionLoading && !suggestion ? (
            <div className="empty helper-empty">
              <p>Sem sugestão pronta para essa data.</p>
              <small className="meta-line">Troque a data ou monte manualmente pelo menos 2 sambas.</small>
            </div>
          ) : null}
          {suggestion ? (
            <div className="clean-card schedule-card pela-hora-suggestion-card">
              <h4>Roteiro sugerido</h4>
              <p className="meta-line">Risco: {suggestion.riskScore} | deslocamento estimado {suggestion.totalTransitMinutes} min</p>
              <p className="meta-line">{riskCopy(suggestion.riskScore)}</p>
              <PelaHoraTimeline items={suggestion.items} statusLabel="Sugerido" />
            </div>
          ) : null}
        </>
      ) : null}

      {user ? <button className="pela-hora-action-btn pela-hora-save-btn" type="button" onClick={handleSave}>Salvar plano do dia</button> : null}
      {user ? <AppToast toast={toast} onClose={() => setToast({ text: "", type: "info" })} /> : null}

      <h3 className="section-title">Planos salvos</h3>
      {user && itinerariesLoading ? <p className="empty">Carregando histórico de Pela Hora...</p> : null}
      {user && !itinerariesLoading && itineraries.length === 0 ? (
        <div className="empty empty-highlight">
          <p>Nenhum plano salvo ainda.</p>
          <small className="meta-line">Escolha 2 ou mais sambas e clique em "Salvar plano do dia".</small>
        </div>
      ) : null}
      <div className="venue-list">
        {itineraries.map((itinerary) => (
          <article key={itinerary.id} className="venue-card itinerary-saved-card">
            <div className="itinerary-saved-head">
              <h3>{itinerary.title}</h3>
              <div className="itinerary-saved-head-actions">
                <small className={`live-status ${riskTone(itinerary.riskScore <= 1 ? "ok" : itinerary.riskScore <= 3 ? "tight" : "risky")}`}>
                  {riskSummary(itinerary.riskScore)}
                </small>
                <button
                  type="button"
                  className="chip plan-delete-btn"
                  onClick={() => handleDeletePlan(itinerary.id)}
                  disabled={deletePelaHora.isPending}
                >
                  {deletePelaHora.isPending ? "Removendo..." : "Excluir"}
                </button>
              </div>
            </div>
            <p className="meta-line itinerary-saved-summary">
              {itinerary.items.length} sambas · {itinerary.totalTransitMinutes} min em deslocamento · {formatDateLong(itinerary.date)}
            </p>
            <PelaHoraTimeline
              items={itinerary.items}
              statusLabel="Confirmado"
              withRoutes
              attendedMap={attendedMap}
              onToggleAttended={toggleAttended}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

