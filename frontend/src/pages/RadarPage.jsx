import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdDeliveryQuery, useMyHistoryQuery, useMyRadarQuery, useToggleHistoryMutation, useToggleRadarMutation } from "../hooks/useEventsQuery";
import { useAuthStore } from "../store/authStore";
import AdSlotCard from "../components/ads/AdSlotCard";
import VerifiedBadge from "../components/common/VerifiedBadge";
import { getAudienceBadges } from "../utils/eventAudienceBadges";
import AppToast from "../components/common/AppToast";
import { trackAnalyticsEvent } from "../services/analytics.service";
import { resolveMediaUrl } from "../services/api";

const RADAR_PREFS_KEY = "napalma:radar:prefs";

function loadRadarPrefs() {
  try {
    const raw = localStorage.getItem(RADAR_PREFS_KEY);
    if (!raw) return { regionFilter: "Todas" };
    const parsed = JSON.parse(raw);
    return { regionFilter: parsed.regionFilter || "Todas" };
  } catch (_error) {
    return { regionFilter: "Todas" };
  }
}

function formatDate(value) {
  const date = new Date(value);
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const weekday = date
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "")
    .replace(/^\w/, (c) => c.toUpperCase());
  const hour = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day}. ${weekday}. ${hour}`;
}

export default function RadarPage() {
  const [regionFilter, setRegionFilter] = useState(loadRadarPrefs().regionFilter);
  const [toast, setToast] = useState({ text: "", type: "info" });
  const user = useAuthStore((state) => state.user);
  const { data: radarEvents = [], isLoading, isError } = useMyRadarQuery(Boolean(user));
  const { data: historyEvents = [] } = useMyHistoryQuery(Boolean(user));
  const toggleHistory = useToggleHistoryMutation();
  const toggleRadar = useToggleRadarMutation();
  const { data: radarAd } = useAdDeliveryQuery("radar_header", Boolean(user));
  const adToRender = radarAd || null;
  const regions = useMemo(
    () => ["Todas", ...Array.from(new Set(radarEvents.map((item) => item.region))).sort()],
    [radarEvents]
  );
  const filteredEvents = useMemo(() => {
    const base = regionFilter === "Todas"
      ? radarEvents
      : radarEvents.filter((item) => item.region === regionFilter);
    return [...base].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [radarEvents, regionFilter]);
  const hasEvents = useMemo(() => filteredEvents.length > 0, [filteredEvents]);

  useEffect(() => {
    localStorage.setItem(RADAR_PREFS_KEY, JSON.stringify({ regionFilter }));
  }, [regionFilter]);

  const historyEventIds = useMemo(() => new Set(historyEvents.map((item) => item.eventId)), [historyEvents]);

  function canConfirmAttendance(event) {
    if (historyEventIds.has(event.id)) return false;
    const now = Date.now();
    const startAt = new Date(event.startsAt).getTime();
    const endAtBase = event.endsAt ? new Date(event.endsAt).getTime() : startAt;
    const deadline = endAtBase + (24 * 60 * 60 * 1000);
    return now >= startAt && now <= deadline;
  }

  function canResolveAttendance(event) {
    const now = Date.now();
    const startAt = new Date(event.startsAt).getTime();
    const endAtBase = event.endsAt ? new Date(event.endsAt).getTime() : startAt;
    const deadline = endAtBase + (24 * 60 * 60 * 1000);
    return now >= startAt && now <= deadline;
  }

  async function handleConfirmAttendance(event) {
    try {
      setToast({ text: "", type: "info" });
      const result = await toggleHistory.mutateAsync({ eventId: event.id, currentlyMarked: false });
      trackAnalyticsEvent("attendance_yes", {
        eventId: event.id,
        venueId: event.venueId,
        artistId: event.artistId,
        region: event.region,
        source: "radar"
      });
      const unlocked = result?.unlockedAchievements || [];
      if (unlocked.length > 0) {
        const first = unlocked[0];
        setToast({ text: `Conquista desbloqueada: ${first.icon || "troféu"} ${first.name}`, type: "success" });
        return;
      }
      setToast({ text: "Presença confirmada no Histórico. Você tem até 24h após o fim para confirmar.", type: "success" });
    } catch (error) {
      const apiMessage = error?.response?.data?.message;
      setToast({ text: apiMessage || "Não foi possível confirmar esse samba agora.", type: "error" });
    }
  }

  async function handleNotAttended(event) {
    try {
      setToast({ text: "", type: "info" });
      await toggleRadar.mutateAsync({ eventId: event.id, currentlyMarked: true });
      trackAnalyticsEvent("attendance_no", {
        eventId: event.id,
        venueId: event.venueId,
        artistId: event.artistId,
        region: event.region,
        source: "radar"
      });
      setToast({ text: "Removido do Radar.", type: "success" });
    } catch (_error) {
      setToast({ text: "Não foi possível remover esse samba do Radar agora.", type: "error" });
    }
  }

  return (
    <section className="screen screen-radar">
      <header className="page-header">
        <h2>Meu Radar</h2>
        <p>Sua lista de intenção: sambas que você quer curtir.</p>
      </header>

      {!user ? (
        <div className="empty login-gate">
          <p>Para salvar sambas no seu Radar, entre ou crie sua conta.</p>
          <Link to="/settings" className="inline-login-cta">Entrar agora</Link>
        </div>
      ) : null}
      {user ? <AdSlotCard ad={adToRender} slot="radar_header" compact /> : null}
      {user && isLoading ? <p className="empty">Carregando seu radar...</p> : null}
      {user && isError ? <p className="empty">Não foi possível carregar seu Radar agora.</p> : null}
      {user && !isLoading && !isError && !hasEvents ? (
        <div className="empty empty-highlight">
          <p>Nenhum samba marcado ainda.</p>
          <small className="meta-line">Salve eventos no Explorar para montar seu Radar.</small>
          <div className="chip-row">
            <Link to="/explore" className="chip">Ir para Explorar</Link>
            <Link to="/pela-hora" className="chip">Montar plano no Pela Hora</Link>
          </div>
        </div>
      ) : null}

      {user && regions.length > 1 ? (
        <div className="chip-row">
          {regions.map((region) => (
            <button
              key={region}
              className={`chip ${regionFilter === region ? "active" : ""}`}
              onClick={() => {
                setRegionFilter(region);
                trackAnalyticsEvent("region_filter", { region, source: "radar" });
              }}
            >
              {region}
            </button>
          ))}
        </div>
      ) : null}
      {user ? <AppToast toast={toast} onClose={() => setToast({ text: "", type: "info" })} /> : null}

      <div className="radar-list">
        {filteredEvents.map((event) => (
          <article key={event.id} className="radar-item">
            <Link to={`/events/${event.id}`} className="radar-item-link">
              <div className="radar-item-media">
                {event.imageUrl ? <img src={resolveMediaUrl(event.posterImageUrl || event.imageUrl)} alt={event.title} /> : <div className="radar-item-fallback" />}
              </div>
                <div className="radar-item-content">
                  <div className="radar-item-top">
                  <strong className="artist-inline-with-badge">
                    <span>{event.title}</span>
                    {event.artistVerified ? <VerifiedBadge className="artist-verified-dot" title="Artista verificado" /> : null}
                  </strong>
                  <span>{event.priceLabel}</span>
                </div>
                <small>{event.venue} - {event.region}</small>
                {event.priceSecondaryLabel ? <small>{event.priceSecondaryLabel}</small> : null}
                <small className="radar-date">{formatDate(event.startsAt)}</small>
                {getAudienceBadges(event).length > 0 ? (
                  <div className="event-audience-row">
                    {getAudienceBadges(event).map((badge) => (
                      <span key={badge} className="event-audience-badge">{badge}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </Link>
            {canResolveAttendance(event) ? (
              <div className="radar-item-actions">
                {canConfirmAttendance(event) ? (
                  <button
                    type="button"
                    className="chip radar-action-chip"
                    onClick={() => handleConfirmAttendance(event)}
                    disabled={toggleHistory.isPending}
                  >
                    {toggleHistory.isPending ? "Confirmando..." : "Eu Fui!"}
                  </button>
                ) : (
                  <span className="chip radar-action-chip is-disabled">Eu Fui!</span>
                )}
                <button
                  type="button"
                  className="chip radar-action-chip"
                  onClick={() => handleNotAttended(event)}
                  disabled={toggleRadar.isPending}
                >
                  {toggleRadar.isPending ? "Removendo..." : "Não fui"}
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

