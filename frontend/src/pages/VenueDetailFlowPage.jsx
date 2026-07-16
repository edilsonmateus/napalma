import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { CalendarClock, MapPin } from "lucide-react";
import { useAdDeliveryQuery, useEventsQuery, useMyRadarQuery, useToggleRadarMutation, useVenuesQuery } from "../hooks/useEventsQuery";
import AdSlotCard from "../components/ads/AdSlotCard";
import { buildGoogleMapsLink, buildUberLink, buildWazeLink } from "../utils/maps";
import { useAuthStore } from "../store/authStore";
import VerifiedBadge from "../components/common/VerifiedBadge";
import { getAudienceBadges } from "../utils/eventAudienceBadges";
import mapsIcon from "../assets/routes/maps.svg";
import wazeIcon from "../assets/routes/waze.svg";
import uberIcon from "../assets/routes/uber.svg";
import { trackAnalyticsEvent } from "../services/analytics.service";
import BackLink from "../components/common/BackLink";

function formatDate(value) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatHour(value) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getLiveStatus(startsAt, endsAt) {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return { label: "", tone: "neutral" };
  if (now < start) {
    const mins = Math.ceil((start - now) / 60000);
    return mins <= 90
      ? { label: `Vai começar em ${mins} min`, tone: "soon" }
      : { label: "Programado", tone: "programmed" };
  }
  if (now <= end) {
    const mins = Math.ceil((end - now) / 60000);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const rest = mins % 60;
      const hhmm = `${hours}:${String(rest).padStart(2, "0")}`;
      return { label: `Rolando agora - termina em ${hhmm}`, tone: "live" };
    }
    return { label: `Rolando agora - termina em ${mins} min`, tone: "live" };
  }
  return { label: "Encerrado", tone: "ended" };
}

function canPromoteVenue(role) {
  return ["admin", "casa", "venue_manager", "produtor", "producer"].includes(role);
}

function buildVenueAdvertiserIntentUrl(venue) {
  const params = new URLSearchParams({
    source: "venue_detail",
    type: "venue",
    objective: "boost_venue",
    name: venue?.name || "Casa",
    accountName: venue?.name || "Casa",
    campaignName: venue?.name || "Casa",
    message: `Quero impulsionar a casa ${venue?.name || ""} no 77Gira para aumentar descoberta, visitas e interesse nos eventos.`
  });
  return `/workspace/anunciante?${params.toString()}`;
}

export default function VenueDetailFlowPage() {
  const { venueId } = useParams();
  const user = useAuthStore((state) => state.user);
  const { data: venues = [], isLoading: venueLoading } = useVenuesQuery();
  const { data: events = [], isLoading: eventsLoading } = useEventsQuery({ venueId });
  const { data: radarEvents = [] } = useMyRadarQuery(Boolean(user));
  const toggleRadar = useToggleRadarMutation();
  const { data: inlineAd } = useAdDeliveryQuery("venue_detail_inline", Boolean(venueId), { venueId });
  const adToRender = inlineAd || null;
  const venue = venues.find((item) => item.id === venueId);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState("");

  useEffect(() => {
    if (!venue) return;
    trackAnalyticsEvent("venue_view", {
      venueId: venue.id,
      region: venue.region,
      city: venue.city,
      state: venue.state,
      source: "venue_detail"
    });
  }, [venue]);

  if (venueLoading) return <p className="empty">Carregando casa...</p>;
  if (!venue) return <p className="empty">Casa não encontrada.</p>;

  const sortedEvents = [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const googleMapsUrl = buildGoogleMapsLink(venue);
  const wazeUrl = buildWazeLink(venue);
  const uberUrl = buildUberLink(venue);
  const showPromoteVenue = canPromoteVenue(user?.role);

  async function handleToggleRadar(eventItem) {
    try {
      setActionFeedback("");
      const currentlyMarked = radarEvents.some((row) => row.id === eventItem.id);
      await toggleRadar.mutateAsync({ eventId: eventItem.id, currentlyMarked });
      trackAnalyticsEvent(currentlyMarked ? "radar_remove" : "radar_save", {
        eventId: eventItem.id,
        venueId: eventItem.venueId,
        artistId: eventItem.artistId,
        region: eventItem.region,
        source: "venue_detail"
      });
      setActionFeedback(currentlyMarked ? "Removido do seu Radar." : "Salvo no seu Radar.");
    } catch (_error) {
      setActionFeedback("Não foi possível atualizar o Radar agora.");
    }
  }

  return (
    <section className="screen screen-radar">
      <BackLink to="/explore">Voltar para Explorar</BackLink>

      {venue.imageUrl ? (
        <div className="event-detail-cover" style={{ backgroundImage: `url(${venue.imageUrl})` }} />
      ) : null}

      <div className="decision-card">
        <h2 className="artist-inline-with-badge">
          <span>{venue.name}</span>
          {venue.goldPartner ? <VerifiedBadge className="artist-verified-dot gold-partner-badge" title="Casa Gold Partner" iconSrc="/goldenVerificado.svg" /> : null}
        </h2>
        <p className="decision-artist">{venue.description || "Casa de samba em destaque na região."}</p>
        <div className="decision-meta">
          <div className="venue-location-muted">
            <div className="meta-line"><MapPin size={14} /> {venue.address}</div>
            <div className="meta-line">{venue.city} - {venue.state} - {venue.region}</div>
            {Array.isArray(venue.openDays) && venue.openDays.length > 0 ? (
              <div className="meta-line">Funciona: {venue.openDays.join(", ")}</div>
            ) : null}
          </div>
          <div className="share-actions">
            {venue.hasPublishedMenu ? <Link className="chip venue-menu-link" to={`/venues/${venue.id}/menu`}>Ver cardápio</Link> : null}
            <button
              type="button"
              className="chip"
              onClick={() => {
                trackAnalyticsEvent("route_click", { venueId: venue.id, region: venue.region, source: "venue_detail" });
                setShowRouteModal(true);
              }}
            >
              Como chegar
            </button>
            {showPromoteVenue ? (
              <Link className="chip event-promote-chip" to={buildVenueAdvertiserIntentUrl(venue)}>
                Promover casa
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <h3 className="section-title">Próximas atrações</h3>
      {eventsLoading ? <p className="empty">Carregando eventos da casa...</p> : null}
      {!eventsLoading && sortedEvents.length === 0 ? (
        <div className="empty empty-highlight">
          <p>Sem eventos cadastrados para esta casa.</p>
          <small className="meta-line">Volte ao Explorar para encontrar outros sambas ao vivo.</small>
          <Link to="/explore" className="chip">Ir para Explorar</Link>
        </div>
      ) : null}
      <div className="feedback feedback-reserved">{actionFeedback || " "}</div>

      <div className="venue-list">
        {sortedEvents.flatMap((event, idx) => {
          const status = getLiveStatus(event.startsAt, event.endsAt);
          const isFuture = new Date(event.startsAt).getTime() > Date.now();
          const inRadar = radarEvents.some((row) => row.id === event.id);
          const eventCard = (
            <Link key={event.id} className="venue-card venue-event-item" to={`/events/${event.id}`}>
              <div className="venue-event-media">
                {event.imageUrl ? <img src={event.imageUrl} alt={event.title} /> : <div className="venue-event-fallback" />}
              </div>
              <div className="venue-event-content">
                <div className="venue-event-top">
                  <h3 className="artist-inline-with-badge">
                    <span>{event.title}</span>
                    {event.artistVerified ? <VerifiedBadge className="artist-verified-dot" title="Artista verificado" /> : null}
                  </h3>
                  <small className="meta-line"><CalendarClock size={14} /> {formatDate(event.startsAt)}</small>
                </div>
                <div className="venue-event-price-row">
                  <p className="meta-line">{event.priceLabel}</p>
                  {user && isFuture ? (
                    <button
                      type="button"
                      className={`venue-event-star-btn ${inRadar ? "active" : ""}`}
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        handleToggleRadar(event);
                      }}
                      disabled={toggleRadar.isPending}
                      aria-label={inRadar ? "No Radar" : "Salvar no Radar"}
                      title={inRadar ? "No Radar" : "Salvar no Radar"}
                    >
                      <span className="venue-event-star-glyph">★</span>
                    </button>
                  ) : null}
                </div>
                {event.priceSecondaryLabel ? <small className="meta-line">{event.priceSecondaryLabel}</small> : null}
                <small className="meta-line">Começa {formatHour(event.startsAt)} - Termina {formatHour(event.endsAt)}</small>
                {getAudienceBadges(event).length > 0 ? (
                  <div className="event-audience-row">
                    {getAudienceBadges(event).map((badge) => (
                      <span key={badge} className="event-audience-badge">{badge}</span>
                    ))}
                  </div>
                ) : null}
                <small className={`meta-line live-status live-status-${status.tone}`}>{status.label}</small>
              </div>
            </Link>
          );
          const shouldInsertAd = Boolean(adToRender) && sortedEvents.length >= 3 && idx === 1;
          if (!shouldInsertAd) return [eventCard];
          return [
            eventCard,
            (
              <div key={`venue-inline-ad-${venue.id}`} className="venue-card venue-inline-ad">
                <AdSlotCard ad={adToRender} slot="venue_detail_inline" compact venueId={venue.id} />
              </div>
            )
          ];
        })}
      </div>
      {showRouteModal ? (
        <div className="modal-backdrop" onClick={() => setShowRouteModal(false)}>
          <article className="modal-card route-mini-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Como chegar</h3>
            <p className="meta-line">Escolha o app para rota:</p>
            <div className="route-mini-layout">
              <div className="route-icon-row">
                <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="route-icon-btn" title="Maps" aria-label="Abrir rota no Maps" onClick={() => trackAnalyticsEvent("route_app_click", { venueId: venue.id, region: venue.region, source: "venue_detail", metadata: { provider: "maps" } })}>
                  <img src={mapsIcon} alt="" className="route-icon-img route-icon-img-maps" />
                </a>
                <a href={wazeUrl} target="_blank" rel="noreferrer" className="route-icon-btn" title="Waze" aria-label="Abrir rota no Waze" onClick={() => trackAnalyticsEvent("route_app_click", { venueId: venue.id, region: venue.region, source: "venue_detail", metadata: { provider: "waze" } })}>
                  <img src={wazeIcon} alt="" className="route-icon-img route-icon-img-waze" />
                </a>
                <a href={uberUrl} target="_blank" rel="noreferrer" className="route-icon-btn" title="Uber" aria-label="Abrir rota no Uber" onClick={() => trackAnalyticsEvent("route_app_click", { venueId: venue.id, region: venue.region, source: "venue_detail", metadata: { provider: "uber" } })}>
                  <img src={uberIcon} alt="" className="route-icon-img route-icon-img-uber" />
                </a>
                <button type="button" className="chip route-mini-chip route-chip-close route-inline-back" onClick={() => setShowRouteModal(false)}>Fechar</button>
              </div>
              <div className="route-mini-track" aria-hidden="true">
                <span className="route-mini-dot route-mini-dot-start" />
                <span className="route-mini-line" />
                <span className="route-mini-dot route-mini-dot-end" />
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}

