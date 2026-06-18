import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CalendarDays, Filter, MapPin, X } from "lucide-react";
import { useAdDeliveryQuery, useEventsQuery, useRegionsQuery, useVenuesQuery } from "../hooks/useEventsQuery";
import AdSlotCard from "../components/ads/AdSlotCard";
import VerifiedBadge from "../components/common/VerifiedBadge";
import { buildGoogleMapsLink, buildUberLink, buildWazeLink } from "../utils/maps";
import { getAudienceBadges } from "../utils/eventAudienceBadges";
import { trackAnalyticsEvent } from "../services/analytics.service";
import mapsIcon from "../assets/routes/maps.svg";
import wazeIcon from "../assets/routes/waze.svg";
import uberIcon from "../assets/routes/uber.svg";

const EXPLORE_PREFS_KEY = "napalma:explore:prefs";
const DEFAULT_PREFS = { city: "São Paulo", region: "Todas", query: "", limit: 8, filterDate: "", filterHour: "", liveOnly: false, timeScope: "semana" };
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
const CITY_OPTIONS = [
  { label: "São Paulo", state: "SP", available: true },
  { label: "Rio de Janeiro", state: "RJ", available: false },
  { label: "Belo Horizonte", state: "MG", available: false },
  { label: "Salvador", state: "BA", available: false },
  { label: "Recife", state: "PE", available: false },
  { label: "Porto Alegre", state: "RS", available: false },
  { label: "Florianópolis", state: "SC", available: false }
];

function loadPrefs() {
  try {
    const raw = localStorage.getItem(EXPLORE_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      city: parsed.city || "São Paulo",
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
  if (diffDays === 1) return "Amanhã";
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

function ExploreSheet({ title, children, onClose }) {
  return (
    <div className="explore-sheet-backdrop" role="presentation" onClick={onClose}>
      <div className="explore-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="explore-sheet-handle" aria-hidden="true" />
        <div className="explore-sheet-header">
          <h3>{title}</h3>
          <button type="button" className="explore-sheet-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function getLiveProgress(startsAt, endsAt) {
  const start = new Date(startsAt).getTime();
  let end = new Date(endsAt).getTime();
  const now = Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  if (end <= start) end += 24 * 60 * 60 * 1000;
  const total = end - start;
  if (total <= 0) return null;
  const elapsed = Math.max(0, Math.min(now - start, total));
  const percent = Math.max(0, Math.min(100, (elapsed / total) * 100));
  let tone = "fresh";
  if (percent >= 86) tone = "last-call";
  else if (percent >= 61) tone = "attention";
  return { percent, tone };
}

function LiveProgressBar({ event }) {
  const progress = getLiveProgress(event.startsAt, event.endsAt);
  if (!progress) return null;
  return (
    <div className={`live-progress live-progress-${progress.tone}`}>
      <div className="live-progress-track" aria-hidden="true">
        <span className="live-progress-fill" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [showDateHourFilter, setShowDateHourFilter] = useState(false);
  const [showCitySheet, setShowCitySheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(prefs.query);
  const { city, region, query, limit, filterDate, filterHour, liveOnly, timeScope } = prefs;
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

  useEffect(() => {
    trackAnalyticsEvent("explore_view", { source: "explore" });
  }, []);
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
  const hasRefinedFilters = region !== "Todas" || liveOnly || hasTimeFilter || timeScope !== "semana";
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

      <div className="explore-top-actions">
        <button className="explore-top-pill" type="button" onClick={() => setShowCitySheet(true)}>
          <MapPin size={16} />
          <span>{city}</span>
        </button>
        <button
          className={`explore-top-icon ${hasTimeFilter ? "active" : ""}`}
          onClick={() => setShowDateHourFilter(true)}
          type="button"
          title="Filtrar por dia e hora"
          aria-label="Filtrar por dia e hora"
        >
          <CalendarDays size={18} />
        </button>
        <button
          className={`explore-top-pill ${hasRefinedFilters ? "active" : ""}`}
          type="button"
          onClick={() => setShowFilterSheet(true)}
        >
          <Filter size={16} />
          <span>Filtros</span>
        </button>
        <button
          className={`explore-top-pill live-filter-chip ${liveEventsCount > 0 ? "has-live" : "no-live"} ${liveOnly ? "active" : ""}`}
          onClick={() => {
            const nextLiveOnly = liveEventsCount > 0 ? !liveOnly : false;
            setPrefs((prev) => ({ ...prev, liveOnly: nextLiveOnly, limit: 8 }));
            trackAnalyticsEvent("live_filter", {
              source: "explore",
              metadata: { enabled: nextLiveOnly, liveEventsCount }
            });
          }}
          disabled={liveEventsCount === 0}
          title={liveEventsCount > 0 ? "Mostrar apenas eventos ao vivo" : "Nenhum evento ao vivo agora"}
        >
          <span className="live-chip-dot" />
          Ao vivo ({liveEventsCount})
        </button>
      </div>

      <div className="explore-controls">
        <input
          className="search-input"
          placeholder="Buscar casa por nome, bairro ou região..."
          value={query}
          onChange={(e) => {
            setPrefs((prev) => ({ ...prev, query: e.target.value, limit: 8 }));
            if (e.target.value.trim().length >= 3) {
              trackAnalyticsEvent("search", {
                source: "explore",
                metadata: { length: e.target.value.trim().length }
              });
            }
          }}
        />
        <button className="chip explore-clear-btn" onClick={() => setPrefs(DEFAULT_PREFS)}>
          Limpar filtros
        </button>
      </div>
      {showDateHourFilter ? (
        <ExploreSheet title="Data e hora" onClose={() => setShowDateHourFilter(false)}>
          <p className="meta-line">Escolha uma data, uma hora cheia ou combine os dois.</p>
          <div className="explore-sheet-grid">
            <input
              className="search-input"
              type="date"
              value={filterDate}
              onChange={(e) => {
                setPrefs((prev) => ({ ...prev, filterDate: e.target.value, limit: 8 }));
                trackAnalyticsEvent("date_filter", {
                  source: "explore",
                  metadata: { filterDate: e.target.value }
                });
              }}
            />
            <select
              className="search-input"
              value={filterHour}
              onChange={(e) => {
                setPrefs((prev) => ({ ...prev, filterHour: e.target.value, limit: 8 }));
                trackAnalyticsEvent("hour_filter", {
                  source: "explore",
                  metadata: { filterHour: e.target.value }
                });
              }}
            >
              <option value="">Qualquer hora</option>
              {HOUR_OPTIONS.map((hour) => (
                <option key={hour} value={hour}>{hour}</option>
              ))}
            </select>
          </div>
          <div className="explore-sheet-actions">
            <button className="chip" onClick={() => setPrefs((prev) => ({ ...prev, filterDate: "", filterHour: "", limit: 8 }))}>Limpar data</button>
            <button className="chip active" onClick={() => setShowDateHourFilter(false)}>Aplicar</button>
          </div>
        </ExploreSheet>
      ) : null}
      {showCitySheet ? (
        <ExploreSheet title="Escolha a praça" onClose={() => setShowCitySheet(false)}>
          <input className="search-input" value="" readOnly placeholder="Procurar uma cidade" />
          <button className="explore-nearby-btn" type="button" disabled>
            <MapPin size={16} />
            Perto de mim em breve
          </button>
          <div className="explore-city-list">
            <p className="explore-country-label">Brasil</p>
            {CITY_OPTIONS.map((item) => (
              <button
                key={`${item.label}-${item.state}`}
                type="button"
                className={`explore-city-option ${city === item.label ? "active" : ""}`}
                disabled={!item.available}
                onClick={() => {
                  if (!item.available) return;
                  setPrefs((prev) => ({ ...prev, city: item.label, region: "Todas", limit: 8 }));
                  trackAnalyticsEvent("region_filter", {
                    source: "explore_city",
                    city: item.label,
                    state: item.state
                  });
                  setShowCitySheet(false);
                }}
              >
                <span className="city-radio" />
                <span>{item.label}</span>
                <small>{item.available ? item.state : "em breve"}</small>
              </button>
            ))}
          </div>
        </ExploreSheet>
      ) : null}
      {showFilterSheet ? (
        <ExploreSheet title="Filtros" onClose={() => setShowFilterSheet(false)}>
          <div className="explore-sheet-section">
            <h4>Período</h4>
            <div className="explore-sheet-chips">
              {["hoje", "semana"].map((scope) => (
                <button
                  key={scope}
                  className={`chip ${timeScope === scope ? "active" : ""}`}
                  onClick={() => setPrefs((prev) => ({ ...prev, timeScope: scope, limit: 8 }))}
                >
                  {scope === "hoje" ? "Hoje" : "Semana"}
                </button>
              ))}
            </div>
          </div>
          <div className="explore-sheet-section">
            <h4>Regiões</h4>
            <div className="explore-sheet-chips">
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
                  onClick={() => {
                    setPrefs((prev) => ({ ...prev, region: item, limit: 8 }));
                    trackAnalyticsEvent("region_filter", {
                      source: "explore",
                      region: item,
                      city
                    });
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="explore-sheet-actions">
            <button className="chip" onClick={() => setPrefs(DEFAULT_PREFS)}>Limpar tudo</button>
            <button className="chip active" onClick={() => setShowFilterSheet(false)}>
              Ver {visibleEventsCount} {visibleEventsCount === 1 ? "samba" : "sambas"}
            </button>
          </div>
        </ExploreSheet>
      ) : null}
      {hasTimeFilter ? <p className="meta-line explore-time-filter-active">Filtro ativo: {activeTimeFilterLabel}</p> : null}
      <AdSlotCard ad={adToRender} slot="explore_feed_large" />
      {!eventsLoading && !isError ? (
        <div className="explore-summary-bar">
          <span>{visibleEventsCount} {visibleEventsCount === 1 ? "samba visível" : "sambas visíveis"}</span>
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
      {isError ? <p className="empty">Não foi possível carregar os sambas agora.</p> : null}
      {!isLoadingState && !isError && grouped.length === 0 ? (
        <div className="empty empty-highlight explore-empty-action">
          <p>Sem eventos para este filtro no momento.</p>
          <small className="meta-line">Tente limpar filtros, trocar região ou ajustar dia/hora.</small>
          <div className="chip-row">
            <button className="chip" onClick={() => setPrefs(DEFAULT_PREFS)}>
              Voltar para visão geral
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
                  {routeModeVenueId !== venue.id && isLiveNow ? <LiveProgressBar event={nextEvent} /> : null}
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
                            trackAnalyticsEvent("route_click", {
                              venueId: venue.id,
                              region: venue.region,
                              city: venue.city,
                              state: venue.state,
                              source: "explore"
                            });
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
                        <small className="meta-line">Sem próxima atração cadastrada</small>
                      )}
                    </div>
                  ) : null}
                </Link>
                {routeModeVenueId === venue.id ? (
                  <div className="venue-flow-body route-options-panel">
                    <div className="route-options-row">
                      <a href={buildGoogleMapsLink(venue)} target="_blank" rel="noreferrer" className="route-icon-btn" title="Maps" aria-label="Abrir rota no Maps" onClick={() => trackAnalyticsEvent("route_app_click", { venueId: venue.id, region: venue.region, city: venue.city, state: venue.state, source: "explore", metadata: { provider: "maps" } })}>
                        <img src={mapsIcon} alt="" className="route-icon-img route-icon-img-maps" />
                      </a>
                      <a href={buildWazeLink(venue)} target="_blank" rel="noreferrer" className="route-icon-btn" title="Waze" aria-label="Abrir rota no Waze" onClick={() => trackAnalyticsEvent("route_app_click", { venueId: venue.id, region: venue.region, city: venue.city, state: venue.state, source: "explore", metadata: { provider: "waze" } })}>
                        <img src={wazeIcon} alt="" className="route-icon-img route-icon-img-waze" />
                      </a>
                      <a href={buildUberLink(venue)} target="_blank" rel="noreferrer" className="route-icon-btn" title="Uber" aria-label="Abrir rota no Uber" onClick={() => trackAnalyticsEvent("route_app_click", { venueId: venue.id, region: venue.region, city: venue.city, state: venue.state, source: "explore", metadata: { provider: "uber" } })}>
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
                  <small className="meta-line">Fique de olho nos próximos dias.</small>
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

