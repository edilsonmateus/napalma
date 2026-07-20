import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Filter, MapPin, X } from "lucide-react";
import { useAdDeliveryQuery, useEventsQuery, useRegionsQuery, useVenuesQuery } from "../hooks/useEventsQuery";
import AdSlotCard from "../components/ads/AdSlotCard";
import VerifiedBadge from "../components/common/VerifiedBadge";
import { buildGoogleMapsLink, buildUberLink, buildWazeLink } from "../utils/maps";
import { getAudienceBadges } from "../utils/eventAudienceBadges";
import { trackAnalyticsEvent } from "../services/analytics.service";
import {
  activateToNaPistaSession,
  deactivateToNaPistaSession,
  deliverToNaPistaSuggestion,
  ensureToNaPistaNotifications,
  notifyToNaPista
} from "../utils/toNaPistaNotifications";
import mapsIcon from "../assets/routes/maps.svg";
import wazeIcon from "../assets/routes/waze.svg";
import uberIcon from "../assets/routes/uber.svg";
import { useAuthStore } from "../store/authStore";

const EXPLORE_PREFS_KEY = "napalma:explore:prefs";
const ON_TRACK_KEY = "77gira:on-track-session";
const ON_TRACK_NOTIFIED_KEY = "77gira:on-track-notified-event";
const ON_TRACK_DISMISSED_KEY = "77gira:on-track-dismissed-event";
const ON_TRACK_DURATION_MS = 60 * 60 * 1000;
const ON_TRACK_RECOMMENDATION_WINDOW_MS = 12 * 60 * 60 * 1000;
const ON_TRACK_INITIAL_NOTIFICATION_DELAY_MS = 3 * 60 * 1000;
// The feed only needs minute-level precision for status/progress. A slower
// clock avoids rebuilding the complete Explore timeline every few seconds on
// lower-powered devices while focus/visibility listeners still refresh it
// immediately when the user returns to the app.
const LIVE_CLOCK_INTERVAL_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
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

function loadOnTrackSession() {
  try {
    const raw = localStorage.getItem(ON_TRACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(ON_TRACK_KEY);
      return null;
    }
    return parsed;
  } catch (_error) {
    return null;
  }
}

function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone === true;
}

function parseCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function distanceKm(from, venue) {
  const lat = parseCoordinate(venue?.latitude ?? venue?.lat);
  const lng = parseCoordinate(venue?.longitude ?? venue?.lng);
  if (!from || lat === null || lng === null) return null;

  const radius = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat - from.latitude);
  const dLng = toRad(lng - from.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(from.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(value) {
  if (value === null || value === undefined) return "perto da sua rota";
  if (value < 1) return `${Math.max(1, Math.round(value * 1000))} m`;
  return `${value.toFixed(value < 10 ? 1 : 0)} km`;
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

function getEventInterval(startsAt, endsAt) {
  const start = new Date(startsAt).getTime();
  let end = new Date(endsAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  if (end <= start) end += ONE_DAY_MS;
  const total = end - start;
  if (total <= 0) return null;
  return { start, end, total };
}

function getLiveProgress(startsAt, endsAt, nowMs) {
  const interval = getEventInterval(startsAt, endsAt);
  if (!interval) return null;
  const elapsed = Math.max(0, Math.min(nowMs - interval.start, interval.total));
  const percent = Math.max(0, Math.min(100, (elapsed / interval.total) * 100));
  let tone = "fresh";
  if (percent >= 86) tone = "last-call";
  else if (percent >= 61) tone = "attention";
  return { percent, tone };
}

function LiveProgressBar({ event, nowMs }) {
  const progress = getLiveProgress(event.startsAt, event.endsAt, nowMs);
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
  const user = useAuthStore((state) => state.user);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [prefs, setPrefs] = useState(loadPrefs);
  const [showCitySheet, setShowCitySheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showOnTrackSheet, setShowOnTrackSheet] = useState(false);
  const [showOnTrackInstallSheet, setShowOnTrackInstallSheet] = useState(false);
  const [showOnTrackLocationSheet, setShowOnTrackLocationSheet] = useState(false);
  const [onTrackSession, setOnTrackSession] = useState(loadOnTrackSession);
  const [onTrackError, setOnTrackError] = useState("");
  const [onTrackNotifiedIds, setOnTrackNotifiedIds] = useState(() => {
    try {
      const raw = sessionStorage.getItem(ON_TRACK_NOTIFIED_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      const legacyValue = sessionStorage.getItem(ON_TRACK_NOTIFIED_KEY);
      return legacyValue ? [legacyValue] : [];
    }
  });
  const [dismissedOnTrackSuggestionId, setDismissedOnTrackSuggestionId] = useState(() => sessionStorage.getItem(ON_TRACK_DISMISSED_KEY) || "");
  const [debouncedQuery, setDebouncedQuery] = useState(prefs.query);
  const { city, region, query, limit, filterDate, filterHour, liveOnly, timeScope } = prefs;
  const selectedRegion = region === "Todas" ? undefined : region;
  const { data: events = [], isLoading: eventsLoading, isFetching: eventsFetching, isError: eventsError, refetch: refetchEvents } = useEventsQuery(
    selectedRegion ? { region: selectedRegion } : {}
  );
  const { data: venues = [], isLoading: venuesLoading, isFetching: venuesFetching, isError: venuesError, refetch: refetchVenues } = useVenuesQuery(
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
  const resumeRefreshTimersRef = useRef([]);
  const lastResumeRefreshAtRef = useRef(0);
  const { data: exploreAd } = useAdDeliveryQuery("explore_feed_large", true);
  const adToRender = useMemo(() => exploreAd || null, [exploreAd]);

  useEffect(() => {
    function syncClock() {
      if (document.visibilityState === "visible") setNowMs(Date.now());
    }

    const timer = window.setInterval(syncClock, LIVE_CLOCK_INTERVAL_MS);
    window.addEventListener("focus", syncClock);
    document.addEventListener("visibilitychange", syncClock);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", syncClock);
      document.removeEventListener("visibilitychange", syncClock);
    };
  }, []);

  useEffect(() => {
    trackAnalyticsEvent("explore_view", { source: "explore" });
  }, []);

  useEffect(() => {
    function refreshProgrammingAfterResume() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastResumeRefreshAtRef.current < 1000) return;
      lastResumeRefreshAtRef.current = now;

      resumeRefreshTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      refetchEvents();
      refetchVenues();
      resumeRefreshTimersRef.current = [2200, 7000].map((delay) => window.setTimeout(() => {
        refetchEvents();
        refetchVenues();
      }, delay));
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") refreshProgrammingAfterResume();
    }

    window.addEventListener("focus", refreshProgrammingAfterResume);
    window.addEventListener("online", refreshProgrammingAfterResume);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", refreshProgrammingAfterResume);
      window.removeEventListener("online", refreshProgrammingAfterResume);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resumeRefreshTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, [refetchEvents, refetchVenues]);
  const venueByName = useMemo(() => {
    const map = new Map();
    for (const venue of venues) {
      map.set(String(venue.name || "").toLowerCase(), venue);
    }
    return map;
  }, [venues]);
  const canLoadMore = false;
  const isLoadingState = venuesLoading || eventsLoading;
  const isRefreshingProgramming = !isLoadingState && (eventsFetching || venuesFetching);
  const isProgrammingLoading = isLoadingState || isRefreshingProgramming;
  const catalogError = eventsError || venuesError;
  const hasTimeFilter = Boolean(filterDate || filterHour);
  const activeTimeFilterLabel = useMemo(() => {
    if (!hasTimeFilter) return "";
    if (filterDate && filterHour) return `${filterDate.split("-").reverse().join("/")} • ${filterHour}`;
    if (filterDate) return `${filterDate.split("-").reverse().join("/")} • qualquer hora`;
    return `Todos os dias • ${filterHour}`;
  }, [filterDate, filterHour, hasTimeFilter]);
  const eventRows = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const rows = [];
    for (const event of events) {
      const eventDate = new Date(event.startsAt);
      const interval = getEventInterval(event.startsAt, event.endsAt);
      if (!interval) continue;
      const { start: time, end: endTime } = interval;
      if (endTime <= nowMs) continue;
      const venue = venueByName.get(String(event.venue || "").toLowerCase());
      if (!venue) continue;
      if (selectedRegion && venue.region !== selectedRegion) continue;
      if (q) {
        const haystack = `${venue.name} ${venue.neighborhood} ${venue.region} ${event.title} ${event.artist}`.toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      const isLiveNow = time <= nowMs && nowMs < endTime;
      if (liveOnly && !isLiveNow) continue;
      if (!filterDate && timeScope === "hoje" && !isSameDay(eventDate, new Date(nowMs))) continue;
      if (!filterDate && timeScope === "semana") {
        const weekLimit = nowMs + (7 * ONE_DAY_MS);
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
  }, [events, venueByName, selectedRegion, debouncedQuery, filterDate, filterHour, liveOnly, timeScope, nowMs]);
  const liveEventsCount = useMemo(() => eventRows.filter((row) => row.isLiveNow).length, [eventRows]);
  const onTrackActive = Boolean(
    onTrackSession?.id
      && onTrackSession?.expiresAt
      && onTrackSession.expiresAt > nowMs
  );
  const onTrackLocation = onTrackSession?.location || null;
  const userDisplayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Sua conta"
    : "";
  const userHandle = user?.username ? `@${String(user.username).replace(/^@/, "")}` : user?.email || "";
  const userInitial = userDisplayName?.trim()?.[0]?.toUpperCase() || "7";
  const onTrackRecommendations = useMemo(() => {
    if (!onTrackActive) return [];
    return eventRows
      .map((row) => {
        const startsAt = new Date(row.nextEvent.startsAt).getTime();
        const distance = distanceKm(onTrackLocation, row.venue);
        return { ...row, startsAt, distance };
      })
      .filter((row) => {
        if (Number.isNaN(row.startsAt)) return false;
        return row.isLiveNow || (row.startsAt >= nowMs && row.startsAt <= nowMs + ON_TRACK_RECOMMENDATION_WINDOW_MS);
      })
      .sort((a, b) => {
        if (a.distance !== null && b.distance !== null && a.distance !== b.distance) return a.distance - b.distance;
        if (a.isLiveNow !== b.isLiveNow) return a.isLiveNow ? -1 : 1;
        return a.startsAt - b.startsAt;
      })
      .slice(0, 2);
  }, [eventRows, onTrackActive, onTrackLocation, nowMs]);
  const onTrackSuggestion = onTrackRecommendations[0] || null;
  const scopeLabel = timeScope === "hoje" ? "Hoje" : "Semana";
  const activeFilterCount = [
    Boolean(query.trim()),
    region !== "Todas",
    Boolean(filterDate),
    Boolean(filterHour),
    timeScope !== "semana"
  ].filter(Boolean).length;
  const cityShortLabel = CITY_OPTIONS.find((item) => item.label === city)?.state || city;
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

  useEffect(() => {
    if (!onTrackActive) return undefined;
    const remaining = Math.max(0, onTrackSession.expiresAt - Date.now());
    const timer = setTimeout(() => {
      localStorage.removeItem(ON_TRACK_KEY);
      setOnTrackSession(null);
    }, remaining);
    return () => clearTimeout(timer);
  }, [onTrackActive, onTrackSession]);

  useEffect(() => {
    if (!onTrackActive || !onTrackSuggestion?.nextEvent?.id) return;

    const eventId = onTrackSuggestion.nextEvent.id;
    if (!onTrackSession?.id || onTrackNotifiedIds.includes(eventId) || onTrackNotifiedIds.length >= 2) return;
    const firstNotificationAt = Number(onTrackSession.startedAt || Date.now()) + ON_TRACK_INITIAL_NOTIFICATION_DELAY_MS;
    const delay = onTrackNotifiedIds.length === 0 ? Math.max(0, firstNotificationAt - Date.now()) : 0;
    const timer = window.setTimeout(async () => {
      const startsCopy = onTrackSuggestion.isLiveNow
        ? "Tá rolando agora"
        : `Começa às ${formatHour(onTrackSuggestion.nextEvent.startsAt)}`;
      const targetUrl = `${window.location.origin}/events/${eventId}`;
      let shouldRecord = true;

      try {
        const result = await deliverToNaPistaSuggestion({ sessionId: onTrackSession.id, eventId });
        if (result.shouldFallback) {
          await notifyToNaPista({
            title: "Tô na Pista sugeriu:",
            body: `${onTrackSuggestion.nextEvent.title} no ${onTrackSuggestion.venue.name} - ${startsCopy}`,
            url: targetUrl
          });
        }
      } catch (error) {
        const code = error?.response?.data?.error;
        if (code === "session_not_active") {
          shouldRecord = false;
          localStorage.removeItem(ON_TRACK_KEY);
          setOnTrackSession(null);
          return;
        }
        if (code === "notification_not_ready") {
          shouldRecord = false;
          return;
        }
        if (!["event_already_delivered", "notification_limit_reached"].includes(code)) {
          await notifyToNaPista({
            title: "Tô na Pista sugeriu:",
            body: `${onTrackSuggestion.nextEvent.title} no ${onTrackSuggestion.venue.name} - ${startsCopy}`,
            url: targetUrl
          }).catch(() => null);
        }
      } finally {
        if (shouldRecord) {
          setOnTrackNotifiedIds((current) => {
            const next = Array.from(new Set([...current, eventId])).slice(0, 2);
            sessionStorage.setItem(ON_TRACK_NOTIFIED_KEY, JSON.stringify(next));
            return next;
          });
        }
      }

      trackAnalyticsEvent("on_track_notification_shown", {
        source: "explore",
        eventId,
        venueId: onTrackSuggestion.venue.id,
        metadata: {
          isLiveNow: onTrackSuggestion.isLiveNow,
          distanceKm: onTrackSuggestion.distance,
          initialDelaySeconds: onTrackNotifiedIds.length === 0 ? 180 : 0
        }
      });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [onTrackActive, onTrackNotifiedIds, onTrackSession, onTrackSuggestion]);

  const requestOnTrack = () => {
    setOnTrackError("");
    if (!user?.city || !user?.neighborhood || !user?.postalCode) {
      setShowOnTrackSheet(false); setShowOnTrackInstallSheet(false); setShowOnTrackLocationSheet(true);
      return;
    }
    if (!navigator.geolocation) {
      setOnTrackError("Seu navegador não liberou localização para esta função.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await ensureToNaPistaNotifications().catch(() => null);
          const session = await activateToNaPistaSession({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          localStorage.setItem(ON_TRACK_KEY, JSON.stringify(session));
          sessionStorage.removeItem(ON_TRACK_NOTIFIED_KEY);
          setOnTrackNotifiedIds([]);
          setOnTrackSession(session);
          setShowOnTrackSheet(false);
          setShowOnTrackInstallSheet(false);
          trackAnalyticsEvent("on_track_enabled", {
            source: "explore",
            metadata: { durationMinutes: 60 }
          });
        } catch (error) {
          if (error?.response?.data?.error === "home_location_required") { setShowOnTrackSheet(false); setShowOnTrackInstallSheet(false); setShowOnTrackLocationSheet(true); return; }
          setOnTrackError(error?.response?.data?.message || "Não foi possível ativar o Tô na Pista agora. Tente novamente em instantes.");
        }
      },
      () => {
        setOnTrackError("Não conseguimos acessar sua localização agora. Você pode tentar novamente pelo navegador.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleOnTrackClick = () => {
    if (onTrackActive) {
      deactivateToNaPistaSession(onTrackSession?.id).catch(() => null);
      localStorage.removeItem(ON_TRACK_KEY);
      setOnTrackSession(null);
      setOnTrackError("");
      trackAnalyticsEvent("on_track_disabled", { source: "explore" });
      return;
    }

    if (!user?.city || !user?.neighborhood || !user?.postalCode) {
      setShowOnTrackLocationSheet(true);
      return;
    }

    if (!isStandalonePwa()) {
      setShowOnTrackInstallSheet(true);
      return;
    }

    setShowOnTrackSheet(true);
  };

  return (
    <section className="screen screen-explore">
      <header className="page-header explore-logo-header">
        <div className="explore-header-row">
          <Link className="explore-brand-wrap" to="/explore" aria-label="77Gira">
          <img
            src="/assets/brand/logoBase77Gira.svg"
            alt="77Gira"
            className="explore-brand-logo"
          />
          </Link>
          {user ? (
            <Link className="explore-user-summary" to="/settings" aria-label="Abrir configurações da conta">
              <span className="explore-user-copy">
                <strong>{userDisplayName}</strong>
                {userHandle ? <small>{userHandle}</small> : null}
              </span>
              <span className="explore-user-avatar" aria-hidden="true">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : userInitial}
              </span>
            </Link>
          ) : (
            <Link className="explore-login-invite" to="/login">
              <strong>Entre no 77Gira</strong>
              <small>Personalize sua experiência</small>
            </Link>
          )}
        </div>
        <div
          className={`explore-brand-separator ${isProgrammingLoading ? "is-loading" : ""}`}
          aria-hidden="true"
        />
        <span className="explore-programming-status" role="status" aria-live="polite">
          {isProgrammingLoading ? "Atualizando a programação." : ""}
        </span>
      </header>

      <div className="explore-top-actions">
        <button className="explore-top-pill" type="button" onClick={() => setShowCitySheet(true)}>
          <MapPin size={16} />
          <span>{cityShortLabel}</span>
        </button>
        <button
          className={`explore-top-pill ${activeFilterCount > 0 ? "active" : ""}`}
          type="button"
          onClick={() => setShowFilterSheet(true)}
        >
          <Filter size={16} />
          <span>Filtros</span>
          {activeFilterCount > 0 ? <span className="explore-filter-count">{activeFilterCount}</span> : null}
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
          <span>Ao vivo</span>
          <span className="explore-live-count">({liveEventsCount})</span>
        </button>
        <button
          className={`explore-top-pill on-track-chip ${onTrackActive ? "active" : ""}`}
          type="button"
          onClick={handleOnTrackClick}
          title={onTrackActive ? "Desligar Tô na Pista" : "Ativar Tô na Pista por 1 hora"}
        >
          <span className="on-track-dot" />
          Tô na Pista
        </button>
      </div>

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
            <h4>Busca</h4>
            <input
              className="search-input"
              placeholder="Buscar casa, bairro, região ou samba..."
              value={query}
              onChange={(e) => {
                setPrefs((prev) => ({ ...prev, query: e.target.value, limit: 8 }));
                if (e.target.value.trim().length >= 3) {
                  trackAnalyticsEvent("search", {
                    source: "explore_filter_sheet",
                    metadata: { length: e.target.value.trim().length }
                  });
                }
              }}
            />
          </div>
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
            <h4>Data e hora</h4>
            <p className="meta-line">Escolha uma data, uma hora cheia ou combine os dois.</p>
            <div className="explore-sheet-grid">
              <input
                className="search-input"
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setPrefs((prev) => ({ ...prev, filterDate: e.target.value, limit: 8 }));
                  trackAnalyticsEvent("date_filter", {
                    source: "explore_filter_sheet",
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
                    source: "explore_filter_sheet",
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
      {showOnTrackInstallSheet ? (
        <ExploreSheet title="Tô na Pista" onClose={() => setShowOnTrackInstallSheet(false)}>
          <div className="on-track-copy">
            <p><strong>Para receber avisos mesmo com o app fechado, instale o 77Gira na tela inicial.</strong></p>
            <p>No Android, use o botão de instalar do navegador. No iPhone, toque em compartilhar e depois em "Adicionar à Tela de Início".</p>
            <p>Enquanto isso, você pode testar a recomendação por localização nesta sessão.</p>
          </div>
          {onTrackError ? <p className="meta-line on-track-error">{onTrackError}</p> : null}
          <div className="explore-sheet-actions on-track-actions">
            <button className="chip" type="button" onClick={() => setShowOnTrackInstallSheet(false)}>Agora não</button>
            <button className="chip active" type="button" onClick={requestOnTrack}>Testar por 1 hora</button>
          </div>
        </ExploreSheet>
      ) : null}
      {showOnTrackLocationSheet ? (
        <ExploreSheet title="Tô na Pista" onClose={() => setShowOnTrackLocationSheet(false)}>
          <div className="on-track-copy"><p><strong>Para usar o Tô na Pista, precisamos saber sua cidade, bairro e CEP.</strong></p><p>Essas informações ajudam o 77Gira a entender sua base de circulação e sugerir experiências mais coerentes com o lugar onde você está.</p><p>Não pedimos seu endereço completo.</p></div>
          <div className="explore-sheet-actions on-track-actions"><button className="chip" type="button" onClick={() => setShowOnTrackLocationSheet(false)}>Agora não</button>{user ? <Link className="chip active" to="/settings/account?edit=location#location-base-editor">Cadastrar localização</Link> : <Link className="chip active" to="/login">Entrar para continuar</Link>}</div>
        </ExploreSheet>
      ) : null}
      {showOnTrackSheet ? (
        <ExploreSheet title="Tô na Pista" onClose={() => setShowOnTrackSheet(false)}>
          <div className="on-track-copy">
            <p><strong>Tá na rua? O 77Gira pode te ajudar a encontrar um samba bom por perto.</strong></p>
            <p>Durante 1 hora, usamos sua localização apenas para sugerir até 2 sambas próximos.</p>
            <p>Sem spam. Sem te seguir depois. Quando der o tempo, a pista fecha sozinha.</p>
          </div>
          {onTrackError ? <p className="meta-line on-track-error">{onTrackError}</p> : null}
          <div className="explore-sheet-actions on-track-actions">
            <button className="chip" type="button" onClick={() => setShowOnTrackSheet(false)}>Cancelar</button>
            <button className="chip active" type="button" onClick={requestOnTrack}>Abrir por 1 hora</button>
          </div>
        </ExploreSheet>
      ) : null}
      {hasTimeFilter ? <p className="meta-line explore-time-filter-active">Filtro ativo: {activeTimeFilterLabel}</p> : null}
      {onTrackActive && onTrackSuggestion && dismissedOnTrackSuggestionId !== onTrackSuggestion.nextEvent.id ? (
        <section className="on-track-strip">
          <Link
            to={`/events/${onTrackSuggestion.nextEvent.id}`}
            className="on-track-strip-copy"
            onClick={() => {
              trackAnalyticsEvent("on_track_suggestion_opened", {
                source: "explore",
                eventId: onTrackSuggestion.nextEvent.id,
                venueId: onTrackSuggestion.venue.id
              });
            }}
          >
            <strong>Tô na Pista sugeriu:</strong>
            <span>
              {onTrackSuggestion.nextEvent.title} no {onTrackSuggestion.venue.name} - {onTrackSuggestion.isLiveNow ? "Tá rolando" : `Começa às ${formatHour(onTrackSuggestion.nextEvent.startsAt)}`}
            </span>
          </Link>
          <div className="on-track-strip-actions">
            <a
              href={buildGoogleMapsLink(onTrackSuggestion.venue)}
              target="_blank"
              rel="noreferrer"
              className="route-icon-btn on-track-route-btn"
              title="Maps"
              onClick={() => trackAnalyticsEvent("route_click", { source: "on_track_strip", routeApp: "maps", venueId: onTrackSuggestion.venue.id, eventId: onTrackSuggestion.nextEvent.id })}
            >
              <img src={mapsIcon} alt="" className="route-icon-img" />
            </a>
            <a
              href={buildWazeLink(onTrackSuggestion.venue)}
              target="_blank"
              rel="noreferrer"
              className="route-icon-btn on-track-route-btn"
              title="Waze"
              onClick={() => trackAnalyticsEvent("route_click", { source: "on_track_strip", routeApp: "waze", venueId: onTrackSuggestion.venue.id, eventId: onTrackSuggestion.nextEvent.id })}
            >
              <img src={wazeIcon} alt="" className="route-icon-img route-icon-img-waze" />
            </a>
            <a
              href={buildUberLink(onTrackSuggestion.venue)}
              target="_blank"
              rel="noreferrer"
              className="route-icon-btn on-track-route-btn"
              title="Uber"
              onClick={() => trackAnalyticsEvent("route_click", { source: "on_track_strip", routeApp: "uber", venueId: onTrackSuggestion.venue.id, eventId: onTrackSuggestion.nextEvent.id })}
            >
              <img src={uberIcon} alt="" className="route-icon-img" />
            </a>
            <button
              type="button"
              className="on-track-strip-dismiss"
              title="Dispensar sugestão"
              onClick={() => {
                sessionStorage.setItem(ON_TRACK_DISMISSED_KEY, onTrackSuggestion.nextEvent.id);
                setDismissedOnTrackSuggestionId(onTrackSuggestion.nextEvent.id);
              }}
            >
              <X size={14} />
            </button>
          </div>
        </section>
      ) : null}
      <AdSlotCard ad={adToRender} slot="explore_feed_large" />
      {!eventsLoading && !catalogError ? (
        <div className="explore-summary-bar">
          <span>{visibleEventsCount} {visibleEventsCount === 1 ? "samba" : "sambas"}</span>
          <span>{scopeLabel}</span>
          <span>{liveOnly ? "Ao vivo" : "Geral"}</span>
          <button className="explore-summary-clear" type="button" onClick={() => setPrefs(DEFAULT_PREFS)}>
            Limpar
          </button>
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
      {catalogError ? (
        <div className="empty empty-highlight explore-empty-action" role="status">
          <p>Não foi possível conectar à programação agora.</p>
          <small className="meta-line">O 77Gira continua tentando. Você também pode atualizar manualmente.</small>
          <button className="chip" type="button" onClick={() => { refetchEvents(); refetchVenues(); }}>Tentar novamente</button>
        </div>
      ) : null}
      {!isLoadingState && !catalogError && grouped.length === 0 ? (
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
      {!isLoadingState && !catalogError && grouped.map((group, groupIndex) => (
        <div key={group.label} className="day-group" style={{ "--reveal-index": groupIndex }}>
          <h4 className="day-group-title">
            <span>{group.label}</span>
            <small className="day-group-count">{group.items.length} {group.items.length === 1 ? "samba" : "sambas"}</small>
          </h4>
          <div className="venue-list explore-venue-grid">
            {group.items.map(({ venue, nextEvent, isLiveNow }) => (
              <article
                key={`${venue.id}-${nextEvent.id}`}
                className={`venue-card venue-flow-card ${isLiveNow ? "venue-flow-live" : "venue-flow-upcoming"} ${routeModeVenueId === venue.id ? "route-mode" : ""}`}
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
                  {routeModeVenueId !== venue.id && isLiveNow ? <LiveProgressBar event={nextEvent} nowMs={nowMs} /> : null}
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
      {!venuesLoading && !catalogError && canLoadMore ? (
        <button className="chip load-more" onClick={() => setPrefs((prev) => ({ ...prev, limit: prev.limit + 8 }))}>
          Carregar mais casas
        </button>
      ) : null}
    </section>
  );
}
