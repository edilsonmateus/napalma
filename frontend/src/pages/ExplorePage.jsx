import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, MapPin } from "lucide-react";
import { useAdDeliveryQuery, useEventsQuery, useRegionsQuery, useVenuesQuery } from "../hooks/useEventsQuery";
import AdSlotCard from "../components/ads/AdSlotCard";
import VerifiedBadge from "../components/common/VerifiedBadge";
import { buildGoogleMapsLink, buildUberLink, buildWazeLink } from "../utils/maps";

const EXPLORE_PREFS_KEY = "napalma:explore:prefs";
const DEFAULT_PREFS = { region: "Todas", query: "", limit: 8 };

function loadPrefs() {
  try {
    const raw = localStorage.getItem(EXPLORE_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      region: parsed.region || "Todas",
      query: parsed.query || "",
      limit: Number(parsed.limit || 8)
    };
  } catch (_error) {
    return DEFAULT_PREFS;
  }
}

function formatGroupLabel(dateValue) {
  const date = new Date(dateValue);
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

function formatShortDateTime(value) {
  const date = new Date(value);
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hour = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day}, ${hour}`;
}

export default function ExplorePage() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [debouncedQuery, setDebouncedQuery] = useState(prefs.query);
  const { region, query, limit } = prefs;
  const selectedRegion = region === "Todas" ? undefined : region;
  const { data: events = [], isLoading: eventsLoading, isError } = useEventsQuery(
    selectedRegion ? { region: selectedRegion } : {}
  );
  const { data: venues = [], isLoading: venuesLoading } = useVenuesQuery(
    selectedRegion ? { region: selectedRegion } : {}
  );
  const { data: regions = [] } = useRegionsQuery();
  const [routeModeVenueId, setRouteModeVenueId] = useState("");
  const { data: exploreAd } = useAdDeliveryQuery("explore_feed_large", true);
  const adToRender = useMemo(() => exploreAd || null, [exploreAd]);
  const filteredVenues = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const base = q
      ? venues.filter((venue) =>
          `${venue.name} ${venue.neighborhood} ${venue.region}`.toLowerCase().includes(q)
        )
      : venues;
    return [...base].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [venues, debouncedQuery]);
  const visible = useMemo(() => filteredVenues.slice(0, limit), [filteredVenues, limit]);
  const hasVenues = useMemo(() => filteredVenues.length > 0, [filteredVenues]);
  const canLoadMore = visible.length < filteredVenues.length;
  const nextEventByVenue = useMemo(() => {
    const now = Date.now();
    const map = new Map();
    for (const event of events) {
      const time = new Date(event.startsAt).getTime();
      if (time < now) continue;
      const key = event.venue.toLowerCase();
      const prev = map.get(key);
      if (!prev || new Date(prev.startsAt).getTime() > time) {
        map.set(key, event);
      }
    }
    return map;
  }, [events]);
  const grouped = useMemo(() => {
    const rows = visible.map((venue) => {
      const nextEvent = nextEventByVenue.get(venue.name.toLowerCase());
      return { venue, nextEvent };
    });
    rows.sort((a, b) => {
      const aTime = a.nextEvent ? new Date(a.nextEvent.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.nextEvent ? new Date(b.nextEvent.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

    const out = [];
    for (const row of rows) {
      const key = row.nextEvent ? formatGroupLabel(row.nextEvent.startsAt) : "Sem data proxima";
      let bucket = out.find((item) => item.label === key);
      if (!bucket) {
        bucket = { label: key, items: [] };
        out.push(bucket);
      }
      bucket.items.push(row);
    }
    return out;
  }, [visible, nextEventByVenue]);

  useEffect(() => {
    localStorage.setItem(EXPLORE_PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <section className="screen screen-explore">
      <header className="page-header">
        <h1>NaPalma</h1>
        <p>O samba da sua cidade, na palma da sua mao</p>
      </header>

      <div className="chip-row">
        <button
          className={`chip ${region === "Todas" ? "active" : ""}`}
          onClick={() => setPrefs((prev) => ({ ...prev, region: "Todas", limit: 8 }))}
        >
          Todas
        </button>
        {regions.map((item) => (
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
        <button className="chip" onClick={() => setPrefs(DEFAULT_PREFS)}>
          Limpar filtros
        </button>
      </div>
      <AdSlotCard ad={adToRender} slot="explore_feed_large" />

      {venuesLoading || eventsLoading ? <p className="empty">Carregando casas e atracoes...</p> : null}
      {isError ? <p className="empty">Nao foi possivel carregar os sambas agora.</p> : null}
      {!venuesLoading && !isError && !hasVenues ? <p className="empty">Sem casas para esta regiao no momento.</p> : null}
      {grouped.length > 0 ? (
        <div className="section-divider">
          <h3>Proximas Atracoes</h3>
          <p>Descubra o que acontece hoje e nos proximos dias.</p>
        </div>
      ) : null}

      {grouped.map((group) => (
        <div key={group.label} className="day-group">
          <h4 className="day-group-title">
            <span>{group.label}</span>
            <small className="day-group-count">{group.items.length} {group.items.length === 1 ? "samba" : "sambas"}</small>
          </h4>
          <div className="venue-list explore-venue-grid">
            {group.items.map(({ venue, nextEvent }) => (
              <article key={venue.id} className={`venue-card venue-flow-card ${routeModeVenueId === venue.id ? "route-mode" : ""}`}>
                <Link to={`/venues/${venue.id}`} className="venue-flow-link">
                  <div className="venue-flow-cover" style={{ backgroundImage: `url(${venue.imageUrl || ""})` }}>
                    <span className="event-region"><MapPin size={12} /> {venue.region}</span>
                    {routeModeVenueId === venue.id ? <span className="event-route-venue">{venue.name}</span> : null}
                  </div>
                  {routeModeVenueId !== venue.id ? (
                    <div className="venue-flow-body">
                      <div className="venue-flow-head">
                        <h3>{venue.name}</h3>
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
                          <small className="meta-line next-event-label">Proxima atracao</small>
                          <p className="meta-line next-event-title artist-inline-with-badge">
                            <span>{nextEvent.title}</span>
                            {nextEvent.artistVerified ? <VerifiedBadge className="artist-verified-dot" title="Artista verificado" /> : null}
                          </p>
                          <small className="meta-line"><CalendarClock size={14} /> {formatShortDateTime(nextEvent.startsAt)}</small>
                        </>
                      ) : (
                        <small className="meta-line">Sem proxima atracao cadastrada</small>
                      )}
                    </div>
                  ) : null}
                </Link>
                {routeModeVenueId === venue.id ? (
                  <div className="venue-flow-body route-options-panel">
                    <div className="share-actions">
                      <a href={buildGoogleMapsLink(venue)} target="_blank" rel="noreferrer" className="chip route-mini-chip route-chip-maps">Maps</a>
                      <a href={buildWazeLink(venue)} target="_blank" rel="noreferrer" className="chip route-mini-chip route-chip-waze">Waze</a>
                      <a href={buildUberLink(venue)} target="_blank" rel="noreferrer" className="chip route-mini-chip route-chip-uber">Uber</a>
                    </div>
                    <div className="form-actions-inline">
                      <button type="button" className="chip route-mini-chip route-chip-close" onClick={() => setRouteModeVenueId("")}>Voltar</button>
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

