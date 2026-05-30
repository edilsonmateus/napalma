import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CalendarDays, MapPin } from "lucide-react";
import { useAdDeliveryQuery, useEventsQuery, useRegionsQuery, useVenuesQuery } from "../hooks/useEventsQuery";
import AdSlotCard from "../components/ads/AdSlotCard";
import VerifiedBadge from "../components/common/VerifiedBadge";
import { buildGoogleMapsLink, buildUberLink, buildWazeLink } from "../utils/maps";
import { getAudienceBadges } from "../utils/eventAudienceBadges";
import mapsIcon from "../assets/routes/maps.svg";
import wazeIcon from "../assets/routes/waze.svg";
import uberIcon from "../assets/routes/uber.svg";

const EXPLORE_PREFS_KEY = "napalma:explore:prefs";
const DEFAULT_PREFS = { region: "Todas", query: "", limit: 8, filterDate: "", filterHour: "", liveOnly: false, timeScope: "semana" };
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

function loadPrefs() {
  try {
    const raw = localStorage.getItem(EXPLORE_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      region: parsed.region || "Todas",
      query: parsed.query || "",
      limit: Number(parsed.limit || 8),
      filterDate: parsed.filterDate || "",
      filterHour: parsed.filterHour || "",
      liveOnly: Boolean(parsed.liveOnly),
      timeScope: ["hoje", "semana"].includes(parsed.timeScope) ? parsed.timeScope : "semana"
    };
  } catch (_error) {
    return DEFAULT_PREFS;
  }
}

function formatGroupLabel(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Sem data";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Amanha";
  const weekdayShort = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  const dayMonth = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${weekdayShort}, ${dayMonth}`;
}

function formatHour(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDayMonth(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--/--";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function isSameDay(dateA, dateB) {
  return dateA.getFullYear() === dateB.getFullYear()
    && dateA.getMonth() === dateB.getMonth()
    && dateA.getDate() === dateB.getDate();
}

export default function ExplorePage() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [showDateHourFilter, setShowDateHourFilter] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(prefs.query);
  const { region, query, limit, filterDate, filterHour, liveOnly, timeScope } = prefs;
  const selectedRegion = region === "Todas" ? undefined : region;
  const { data: events = [], isLoading: eventsLoading, isError } = useEventsQuery(
    selectedRegion ? { region: selectedRegion } : {}
  );
  const { data: venues = [], isLoading: venuesLoading } = useVenuesQuery(
    selectedRegion ? { region: selectedRegion } : {}
  );
  const { data: regions = [] } = useRegionsQuery();
  const regionOptions = useMemo(
    () =>
      regions
        .map((item) => (typeof item === "string" ? item : item?.name))
        .filter((item) => typeof item === "string" && item.trim().length > 0),
    [regions]
  );
  useEffect(() => {
    if (prefs.region === "Todas") return;
    if (regionOptions.length === 0) return;
    if (!regionOptions.includes(prefs.region)) {
      setPrefs((prev) => ({ ...prev, region: "Todas" }));
    }
  }, [prefs.region, regionOptions]);
  const [routeModeVenueId, setRouteModeVenueId] = useState("");
  const { data: exploreAd } = useAdDeliveryQuery("explore_feed_large", true);
  const adToRender = useMemo(() => exploreAd || null, [exploreAd]);
  const venueByName = useMemo(() => {
    const map = new Map();
    for (const venue of venues) {
      map.set(String(venue.name || "").toLowerCase(), venue);
    }
    return map;
  }, [venues]);
  const canLoadMore = false;
  const isLoadingState = venuesLoading || eventsLoading;
  const hasTimeFilter = Boolean(filterDate || filterHour);
  const activeTimeFilterLabel = useMemo(() => {
    if (!hasTimeFilter) return "";
    if (filterDate && filterHour) return `${filterDate.split("-").reverse().join("/")} • ${filterHour}`;
    if (filterDate) return `${filterDate.split("-").reverse().join("/")} • qualquer hora`;
    return `Todos os dias • ${filterHour}`;
  }, [filterDate, filterHour, hasTimeFilter]);
  const eventRows = useMemo(() => {
    const now = Date.now();
    const q = debouncedQuery.trim().toLowerCase();
    const rows = [];
    for (const event of events) {
      const eventDate = new Date(event.startsAt);
      const eventEndsAt = new Date(event.endsAt);
      const time = eventDate.getTime();
      const endTime = eventEndsAt.getTime();
      if (Number.isNaN(time) || Number.isNaN(endTime)) continue;
      if (endTime < now) continue;
      const venue = venueByName.get(String(event.venue || "").toLowerCase());
      if (!venue) continue;
      if (selectedRegion && venue.region !== selectedRegion) continue;
      if (q) {
        const haystack = `${venue.name} ${venue.neighborhood} ${venue.region} ${event.title} ${event.artist}`.toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      const isLiveNow = Boolean(event.isLiveNow) || (time <= now && endTime >= now);
      if (liveOnly && !isLiveNow) continue;
      if (timeScope === "hoje" && !isSameDay(eventDate, new Date())) continue;
      if (timeScope === "semana") {
        const weekLimit = now + (7 * 24 * 60 * 60 * 1000);
        if (time > weekLimit) continue;
      }
      if (filterDate) {
        const day = String(eventDate.getDate()).padStart(2, "0");
        const month = String(eventDate.getMonth() + 1).padStart(2, "0");
        const year = String(eventDate.getFullYear());
        const formatted = `${year}-${month}-${day}`;
        if (formatted !== filterDate) continue;
      }
      if (filterHour) {
        const eventHour = String(eventDate.getHours()).padStart(2, "0");
        const selectedHour = filterHour.slice(0, 2);
        if (eventHour !== selectedHour) continue;
      }
      rows.push({
        key: event.id,
        venue,
        nextEvent: event,
        isLiveNow
      });
    }
    return rows.sort((a, b) => new Date(a.nextEvent.startsAt).getTime() - new Date(b.nextEvent.startsAt).getTime());
  }, [events, venueByName, selectedRegion, debouncedQuery, filterDate, filterHour, liveOnly, timeScope]);
  const liveEventsCount = useMemo(() => eventRows.filter((row) => row.isLiveNow).length, [eventRows]);
  const scopeLabel = timeScope === "hoje" ? "Hoje" : "Semana";
  const grouped = useMemo(() => {
    const rows = eventRows.slice(0, limit);

    const out = [];
    for (const row of rows) {
      const key = formatGroupLabel(row.nextEvent.startsAt);
      let bucket = out.find((item) => item.label === key);
      if (!bucket) {
        bucket = { label: key, items: [] };
        out.push(bucket);
      }
      bucket.items.push(row);
    }
    return out;
  }, [eventRows, limit]);
  const visibleEventsCount = useMemo(
    () => grouped.reduce((acc, group) => acc + group.items.length, 0),
    [grouped]
  );

  useEffect(() => {
    localStorage.setItem(EXPLORE_PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <section className="screen screen-explore">
      <header className="page-header explore-logo-header">
        <div className="explore-brand-wrap" aria-label="77Gira - Todos os Sambas Aqui">
          <img
            src="/assets/brand/logoBase77Gira.svg"
            alt="77Gira - Todos os Sambas Aqui"
            className="explore-brand-logo"
          />
          <p className="explore-brand-concept">Todos os Sambas Aqui</p>
          <div className="explore-brand-separator" aria-hidden="true" />
        </div>
      </header>

      <div className="chip-row">
        <button
          className={`chip explore-scope-chip ${timeScope === "hoje" ? "active" : ""}`}
          onClick={() => setPrefs((prev) => ({ ...prev, timeScope: "hoje", limit: 8 }))}
        >
          Hoje
        </button>
        <button
          className={`chip explore-scope-chip ${timeScope === "semana" ? "active" : ""}`}
          onClick={() => setPrefs((prev) => ({ ...prev, timeScope: "semana", limit: 8 }))}
        >
          Semana
        </button>
        <button
          className={`chip live-filter-chip ${liveEventsCount > 0 ? "has-live" : "no-live"} ${liveOnly ? "active" : ""}`}
          onClick={() => setPrefs((prev) => ({ ...prev, liveOnly: liveEventsCount > 0 ? !prev.liveOnly : false, limit: 8 }))}
          disabled={liveEventsCount === 0}
          title={liveEventsCount > 0 ? "Mostrar apenas eventos ao vivo" : "Nenhum evento ao vivo agora"}
        >
          <span className="live-chip-dot" />
          Ao vivo ({liveEventsCount})
        </button>
        <button
          className={`chip ${region === "Todas" ? "active" : ""}`}
          onClick={() => setPrefs((prev) => ({ ...prev, region: "Todas", limit: 8 }))}
        >
          Todas
        </button>
        {regionOptions.map((item) => (
          <button
            key={item}
            className={`chip ${region === item ? "active" : ""}`}
            onClick={() => setPrefs((prev) => ({ ...prev, region: item, limit: 8 }))}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="explore-controls">
        <input
          className="search-input"
          placeholder="Buscar casa por nome, bairro ou regiao..."
          value={query}
          onChange={(e) => setPrefs((prev) => ({ ...prev, query: e.target.value, limit: 8 }))}
        />
        <button
          className={`chip explore-calendar-trigger ${hasTimeFilter ? "active" : ""}`}
          onClick={() => setShowDateHourFilter((prev) => !prev)}
          type="button"
          title="Filtrar por dia e hora"
          aria-label="Filtrar por dia e hora"
        >
          <CalendarDays size={14} />
        </button>
        <button className="chip explore-clear-btn" onClick={() => setPrefs(DEFAULT_PREFS)}>
          Limpar filtros
        </button>
      </div>
      {showDateHourFilter ? (
        <div className="explore-datehour-panel">
          <input
            className="search-input"
            type="date"
            value={filterDate}
            onChange={(e) => setPrefs((prev) => ({ ...prev, filterDate: e.target.value, limit: 8 }))}
          />
          <select
            className="search-input"
            value={filterHour}
            onChange={(e) => setPrefs((prev) => ({ ...prev, filterHour: e.target.value, limit: 8 }))}
          >
            <option value="">Qualquer hora</option>
            {HOUR_OPTIONS.map((hour) => (
              <option key={hour} value={hour}>{hour}</option>
            ))}
          </select>
        </div>
      ) : null}
      {hasTimeFilter ? <p className="meta-line explore-time-filter-active">Filtro ativo: {activeTimeFilterLabel}</p> : null}
      <AdSlotCard ad={adToRender} slot="explore_feed_large" />
      {!eventsLoading && !isError ? (
        <div className="explore-summary-bar">
          <span>{visibleEventsCount} {visibleEventsCount === 1 ? "samba visivel" : "sambas visiveis"}</span>
          <span>Escopo: {scopeLabel}</span>
          <span>{liveOnly ? "Modo ao vivo" : "Modo geral"}</span>
        </div>
      ) : null}

      {isLoadingState ? (
        <div className="explore-loading-grid" aria-live="polite" aria-busy="true">
          {Array.from({ length: 4 }).map((_, idx) => (
            <article key={`skeleton-${idx}`} className="venue-card venue-flow-card venue-flow-skeleton">
              <div className="venue-flow-cover" />
              <div className="venue-flow-body">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-meta" />
                <div className="skeleton-line skeleton-meta short" />
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {isError ? <p className="empty">Nao foi possivel carregar os sambas agora.</p> : null}
      {!isLoadingState && !isError && grouped.length === 0 ? (
        <div className="empty empty-highlight explore-empty-action">
          <p>Sem eventos para este filtro no momento.</p>
          <small className="meta-line">Tente limpar filtros, trocar regiao ou ajustar dia/hora.</small>
          <div className="chip-row">
            <button className="chip" onClick={() => setPrefs(DEFAULT_PREFS)}>
              Voltar para visao geral
            </button>
            <button
              className="chip"
              onClick={() => setPrefs((prev) => ({ ...prev, filterDate: "", filterHour: "", liveOnly: false, limit: 8 }))}
            >
              Limpar dia e hora
            </button>
          </div>
        </div>
      ) : null}
      {!isLoadingState && grouped.map((group, groupIndex) => (
        <div key={group.label} className="day-group" style={{ "--reveal-index": groupIndex }}>
          <h4 className="day-group-title">
            <span>{group.label}</span>
            <small className="day-group-count">{group.items.length} {group.items.length === 1 ? "samba" : "sambas"}</small>
          </h4>
          <div className="venue-list explore-venue-grid">
            {group.items.map(({ venue, nextEvent, isLiveNow }, idx) => (
              <article
                key={`${venue.id}-${nextEvent.id}-${idx}`}
                className={`venue-card venue-flow-card ${isLiveNow ? "venue-flow-live" : "venue-flow-upcoming"} ${routeModeVenueId === venue.id ? "route-mode" : ""}`}
                style={{ "--reveal-item-index": idx }}
              >
                <Link to={`/venues/${venue.id}`} className="venue-flow-link">
                  <div className="venue-flow-cover">
                    {venue.imageUrl ? (
                      <img
                        src={venue.imageUrl}
                        alt={venue.name}
                        className="venue-flow-cover-img"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    <span className="event-region"><MapPin size={12} /> {venue.region}</span>
                    {routeModeVenueId === venue.id ? <span className="event-route-venue">{venue.name}</span> : null}
                  </div>
                  {routeModeVenueId !== venue.id ? (
                    <div className="venue-flow-body">
                      <div className="venue-flow-head">
                        <h3 className="artist-inline-with-badge">
                          <span>{venue.name}</span>
                          {venue.goldPartner ? <VerifiedBadge className="artist-verified-dot gold-partner-badge" title="Casa Gold Partner" iconSrc="/goldenVerificado.svg" /> : null}
                        </h3>
                        <button
                          type="button"
                          className="chip route-inline-trigger"
                          onClick={(event) => {
                            event.preventDefault();
                            setRouteModeVenueId(venue.id);
                          }}
                        >
                          <MapPin size={12} /> Partiu Agora!
                        </button>
                      </div>
                      <p className="meta-line venue-neighborhood-line">{venue.neighborhood}</p>
                      {nextEvent ? (
                        <>
                          <p className="meta-line next-event-label">Próxima atração</p>
                          <p className="meta-line next-event-title artist-inline-with-badge">
                            <span>{nextEvent.title}</span>
                            {nextEvent.artistVerified ? <VerifiedBadge className="artist-verified-dot" title="Artista verificado" /> : null}
                          </p>
                          {!isLiveNow ? (
                            <small className="meta-line"><CalendarClock size={14} /> Começa às {formatHour(nextEvent.startsAt)} • {formatDayMonth(nextEvent.startsAt)}</small>
                          ) : (
                            <small className="meta-line event-live-inline">
                              <span className="live-dot" />
                              <strong>Tá rolando</strong>
                              <span>termina às {formatHour(nextEvent.endsAt)}</span>
                            </small>
                          )}
                          {getAudienceBadges(nextEvent).length > 0 ? (
                            <div className="event-audience-row">
                              {getAudienceBadges(nextEvent).map((badge) => (
                                <span key={badge} className="event-audience-badge">{badge}</span>
                              ))}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <small className="meta-line">Sem proxima atracao cadastrada</small>
                      )}
                    </div>
                  ) : null}
                </Link>
                {routeModeVenueId === venue.id ? (
                  <div className="venue-flow-body route-options-panel">
                    <div className="route-options-row">
                      <a href={buildGoogleMapsLink(venue)} target="_blank" rel="noreferrer" className="route-icon-btn" title="Maps" aria-label="Abrir rota no Maps">
                        <img src={mapsIcon} alt="" className="route-icon-img route-icon-img-maps" />
                      </a>
                      <a href={buildWazeLink(venue)} target="_blank" rel="noreferrer" className="route-icon-btn" title="Waze" aria-label="Abrir rota no Waze">
                        <img src={wazeIcon} alt="" className="route-icon-img route-icon-img-waze" />
                      </a>
                      <a href={buildUberLink(venue)} target="_blank" rel="noreferrer" className="route-icon-btn" title="Uber" aria-label="Abrir rota no Uber">
                        <img src={uberIcon} alt="" className="route-icon-img route-icon-img-uber" />
                      </a>
                      <button type="button" className="chip route-mini-chip route-chip-close route-inline-back" onClick={() => setRouteModeVenueId("")}>Voltar</button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
            {group.items.length === 1 ? (
              <article className="venue-card venue-flow-card venue-flow-placeholder" aria-hidden="true">
                <div className="venue-flow-cover" />
                <div className="venue-flow-body">
                  <h3>Mais samba chegando</h3>
                  <p className="meta-line">Em breve essa agenda enche.</p>
                  <small className="meta-line">Fique de olho nos proximos dias.</small>
                </div>
              </article>
            ) : null}
          </div>
        </div>
      ))}
      {!venuesLoading && !isError && canLoadMore ? (
        <button className="chip load-more" onClick={() => setPrefs((prev) => ({ ...prev, limit: prev.limit + 8 }))}>
          Carregar mais casas
        </button>
      ) : null}
    </section>
  );
}

