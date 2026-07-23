import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarClock, Copy, MapPin, Send, Share2, Star } from "lucide-react";
import {
  useEventsQuery,
  useMyRadarQuery,
  useToggleRadarMutation
} from "../hooks/useEventsQuery";
import { useAuthStore } from "../store/authStore";
import { buildGoogleMapsLink, buildUberLink, buildWazeLink, getVenueAddressString } from "../utils/maps";
import VerifiedBadge from "../components/common/VerifiedBadge";
import { getAudienceBadges } from "../utils/eventAudienceBadges";
import mapsIcon from "../assets/routes/maps.svg";
import wazeIcon from "../assets/routes/waze.svg";
import uberIcon from "../assets/routes/uber.svg";
import AppToast from "../components/common/AppToast";
import { trackAnalyticsEvent } from "../services/analytics.service";
import BackLink from "../components/common/BackLink";
import ArtistProfileGateway from "../components/artists/ArtistProfileGateway";
import { resolveMediaUrl } from "../services/api";

function formatDate(value) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDayMonth(value) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatHour(value) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function normalizePriceForShare(priceLabel) {
  if (!priceLabel) return "";
  if (priceLabel.toLowerCase().includes("gratuito")) return "grátis";
  return priceLabel;
}

function formatCalendarDate(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function stripBrazilZipCode(value) {
  return String(value || "")
    .replace(/\s*[-,]\s*\d{5}-\d{3}\s*$/u, "")
    .trim();
}

function canPromoteEvent(role) {
  return ["admin", "casa", "venue_manager", "produtor", "producer"].includes(role);
}

function buildEventAdvertiserIntentUrl(event) {
  const params = new URLSearchParams({
    source: "event_detail",
    type: "venue",
    objective: "boost_event",
    name: event.venue || event.title || "Evento",
    accountName: event.venue || event.title || "Evento",
    campaignName: event.title || "Evento",
    message: `Quero impulsionar o evento "${event.title}", na casa ${event.venue}, em ${event.region}.`
  });
  return `/workspace/anunciante?${params.toString()}`;
}

export default function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data: events = [], isLoading } = useEventsQuery();
  const { data: radarEvents = [] } = useMyRadarQuery(Boolean(user));
  const toggleRadar = useToggleRadarMutation();
  const [toast, setToast] = useState({ text: "", type: "info" });
  const [shareNote, setShareNote] = useState("");
  const [showRouteModal, setShowRouteModal] = useState(false);

  const event = useMemo(() => events.find((item) => item.id === eventId), [eventId, events]);
  const marked = useMemo(() => radarEvents.some((item) => item.id === eventId), [eventId, radarEvents]);

  useEffect(() => {
    if (!event) return;
    trackAnalyticsEvent("event_view", {
      eventId: event.id,
      venueId: event.venueId,
      artistId: event.artistId,
      region: event.region,
      city: event.city,
      state: event.state,
      source: "event_detail"
    });
  }, [event]);

  if (isLoading) return <p className="empty">Carregando evento...</p>;
  if (!event) return <p>Evento não encontrado.</p>;

  const shareTitle = `${event.title} | 77Gira`;
  const showArtistLine = Boolean(event.artist && event.artist !== event.title);
  const venueAddress = getVenueAddressString(event);
  const venueAddressDisplay = stripBrazilZipCode(venueAddress);
  const locationLabel = venueAddressDisplay || `${event.venue} - ${event.region}`;
  const googleMapsUrl = buildGoogleMapsLink(event);
  const wazeUrl = buildWazeLink(event);
  const uberUrl = buildUberLink(event);
  const baseShareText = `Vai ter ${event.title}. Onde? ${event.venue}, dia ${formatDayMonth(event.startsAt)} às ${formatHour(event.startsAt)} (${normalizePriceForShare(event.priceLabel)}). Bora? Olha no app que tem todos os sambas em um lugar só:`;
  const shareText = shareNote?.trim()
    ? `${shareNote.trim()} ${baseShareText}`
    : baseShareText;
  const shareUrl = window.location.href;
  const encodedText = encodeURIComponent(`${shareText}\n${shareUrl}`);
  const whatsappUrl = `https://wa.me/?text=${encodedText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatCalendarDate(event.startsAt)}/${formatCalendarDate(event.endsAt)}&details=${encodeURIComponent(`${event.artist} | ${event.priceLabel}`)}&location=${encodeURIComponent(`${event.venue} - ${event.region}`)}`;
  const showPromoteEvent = canPromoteEvent(user?.role);

  async function handleNativeShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        trackAnalyticsEvent("event_share", {
          eventId: event.id,
          venueId: event.venueId,
          artistId: event.artistId,
          region: event.region,
          source: "event_detail",
          metadata: { channel: "native" }
        });
        setToast({ text: "Compartilhado com sucesso.", type: "success" });
        return;
      }
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      trackAnalyticsEvent("event_share", {
        eventId: event.id,
        venueId: event.venueId,
        artistId: event.artistId,
        region: event.region,
        source: "event_detail",
        metadata: { channel: "copy_fallback" }
      });
      setToast({ text: "Link copiado para compartilhar.", type: "success" });
    } catch (_error) {
      setToast({ text: "Não foi possível compartilhar agora.", type: "error" });
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      trackAnalyticsEvent("event_share", {
        eventId: event.id,
        venueId: event.venueId,
        artistId: event.artistId,
        region: event.region,
        source: "event_detail",
        metadata: { channel: "copy" }
      });
      setToast({ text: "Link copiado para compartilhar.", type: "success" });
    } catch (_error) {
      setToast({ text: "Não foi possível copiar o link.", type: "error" });
    }
  }

  function handleDownloadIcs() {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//77Gira//Samba Agenda//PT-BR",
      "BEGIN:VEVENT",
      `UID:${event.id}@77gira.app`,
      `DTSTAMP:${formatCalendarDate(new Date().toISOString())}`,
      `DTSTART:${formatCalendarDate(event.startsAt)}`,
      `DTEND:${formatCalendarDate(event.endsAt)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.artist} | ${event.priceLabel}`,
      `LOCATION:${venueAddress || `${event.venue} - ${event.region}`}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${event.title.replace(/\s+/g, "-").toLowerCase()}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setToast({ text: "Arquivo de agenda baixado (.ics).", type: "success" });
  }

  async function handleToggleRadar() {
    try {
      setToast({ text: "", type: "info" });
      const result = await toggleRadar.mutateAsync({ eventId: event.id, currentlyMarked: marked });
      trackAnalyticsEvent(marked ? "radar_remove" : "radar_save", {
        eventId: event.id,
        venueId: event.venueId,
        artistId: event.artistId,
        region: event.region,
        source: "event_detail"
      });
      const unlocked = result?.unlockedAchievements || [];
      if (unlocked.length > 0) {
        const first = unlocked[0];
        setToast({ text: `Conquista desbloqueada: ${first.icon || "trofeu"} ${first.name}`, type: "success" });
        return;
      }
      setToast({ text: marked ? "Evento removido do seu Radar." : "Evento salvo no seu Radar.", type: "success" });
    } catch (_error) {
      setToast({ text: "Não foi possível atualizar o Radar agora.", type: "error" });
    }
  }

  return (
    <section className="screen screen-decision event-decision">
      <BackLink onClick={() => navigate(-1)}>Voltar</BackLink>

      <div
        className="event-detail-cover"
        style={{ backgroundImage: `url(${resolveMediaUrl(event.posterImageUrl || event.imageUrl)})` }}
      />

      <div className="decision-card">
        <p className="event-host-label">{event.venue} Recebe:</p>
        <div className="event-title-row">
          <h2 className="event-title-with-badge">
            <span>{event.title}</span>
            {event.artistVerified ? <VerifiedBadge className="artist-verified-dot" title="Artista verificado" /> : null}
          </h2>
        </div>
        {showArtistLine ? (
          <div className="decision-artist-wrap">
            <p className="decision-artist">
              <span>{event.artist}</span>
            </p>
          </div>
        ) : null}
        <p className="decision-price">{event.priceLabel}</p>
        {event.priceSecondaryLabel ? <p className="meta-line">{event.priceSecondaryLabel}</p> : null}

        <div className="decision-meta">
          <div className="meta-line event-address-line"><MapPin size={14} /> {locationLabel}</div>
          <div className="meta-line"><CalendarClock size={14} /> {formatDate(event.startsAt)}</div>
          {getAudienceBadges(event).length > 0 ? (
            <div className="event-audience-row">
              {getAudienceBadges(event).map((badge) => (
                <span key={badge} className="event-audience-badge">{badge}</span>
              ))}
            </div>
          ) : null}
          <div className="share-actions">
            {user ? (
              <button
                className={`chip event-radar-action ${marked && !toggleRadar.isPending ? "is-marked" : ""}`}
                onClick={handleToggleRadar}
                disabled={toggleRadar.isPending}
              >
                <Star size={14} className={marked && !toggleRadar.isPending ? "is-lit" : undefined} />
                <span className="event-inline-action-label">{toggleRadar.isPending ? "Atualizando..." : marked ? "Marcado no seu Radar" : "Guardar no Radar"}</span>
              </button>
            ) : null}
            <button
              type="button"
              className="chip"
              onClick={() => {
                trackAnalyticsEvent("route_click", { eventId: event.id, venueId: event.venueId, region: event.region, source: "event_detail" });
                setShowRouteModal(true);
              }}
            >
              <span className="event-inline-action-label">Como chegar</span>
            </button>
          </div>
        </div>

        {!user ? (
          <div className="empty login-gate">
            <p>Quer salvar no Radar? Entre na sua conta.</p>
            <Link to="/settings" className="inline-login-cta">Entrar agora</Link>
          </div>
        ) : null}
        {user && showPromoteEvent ? (
          <div className="decision-actions">
            <Link className="chip event-promote-chip" to={buildEventAdvertiserIntentUrl(event)}>
              Promover evento
            </Link>
          </div>
        ) : null}

        <div className="event-artist-gateway-row">
          <ArtistProfileGateway
            artistId={event.artistId}
            artistName={event.artist || "Artista"}
            artistImageUrl={event.artistImageUrl}
            verified={event.artistVerified}
            onClick={() => trackAnalyticsEvent("artist_profile_click", {
              eventId: event.id,
              venueId: event.venueId,
              artistId: event.artistId,
              region: event.region,
              source: "event_detail"
            })}
          />
        </div>

        <div className="share-panel">
          <strong>Compartilhe com uma mensagem</strong>
          <input
            className="search-input share-input"
            value={shareNote}
            onChange={(e) => setShareNote(e.target.value)}
            placeholder="Desentoca, Carolina. Vamos pro samba! Olha o que eu achei."
            maxLength={90}
          />
          <div className="share-actions">
            <button className="chip share-action share-action-primary" onClick={handleNativeShare}>
              <Share2 size={14} /> Chamar a galera
            </button>
            <button className="chip share-action" onClick={handleCopyLink}>
              <Copy size={14} /> Copiar link
            </button>
          </div>
          <div className="share-links share-links-primary">
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="chip share-link" onClick={() => trackAnalyticsEvent("event_share", { eventId: event.id, venueId: event.venueId, artistId: event.artistId, region: event.region, source: "event_detail", metadata: { channel: "whatsapp" } })}><Send size={14} /> WhatsApp</a>
            <a href={telegramUrl} target="_blank" rel="noreferrer" className="chip share-link" onClick={() => trackAnalyticsEvent("event_share", { eventId: event.id, venueId: event.venueId, artistId: event.artistId, region: event.region, source: "event_detail", metadata: { channel: "telegram" } })}><Send size={14} /> Telegram</a>
            <a href={facebookUrl} target="_blank" rel="noreferrer" className="chip share-link" onClick={() => trackAnalyticsEvent("event_share", { eventId: event.id, venueId: event.venueId, artistId: event.artistId, region: event.region, source: "event_detail", metadata: { channel: "facebook" } })}><Share2 size={14} /> Facebook</a>
          </div>
          <section className="share-calendar-group" aria-label="Salvar evento na agenda">
            <strong className="share-calendar-label">Salve na sua agenda</strong>
            <div className="share-actions share-calendar-actions">
              <a href={googleCalendarUrl} target="_blank" rel="noreferrer" className="chip event-calendar-action"><CalendarClock size={14} /><span className="event-inline-action-label">Google Agenda</span></a>
              <button className="chip event-calendar-action" onClick={handleDownloadIcs}>
                <CalendarClock size={14} /><span className="event-inline-action-label">Apple/Outlook (.ics)</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      <AppToast toast={toast} onClose={() => setToast({ text: "", type: "info" })} />
      {showRouteModal ? (
        <div className="modal-backdrop" onClick={() => setShowRouteModal(false)}>
          <article className="modal-card route-mini-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Como chegar</h3>
            <p className="meta-line">Escolha o app para rota:</p>
            <div className="route-mini-layout">
              <div className="route-icon-row">
                <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="route-icon-btn" title="Maps" aria-label="Abrir rota no Maps" onClick={() => trackAnalyticsEvent("route_app_click", { eventId: event.id, venueId: event.venueId, region: event.region, source: "event_detail", metadata: { provider: "maps" } })}>
                  <img src={mapsIcon} alt="" className="route-icon-img route-icon-img-maps" />
                </a>
                <a href={wazeUrl} target="_blank" rel="noreferrer" className="route-icon-btn" title="Waze" aria-label="Abrir rota no Waze" onClick={() => trackAnalyticsEvent("route_app_click", { eventId: event.id, venueId: event.venueId, region: event.region, source: "event_detail", metadata: { provider: "waze" } })}>
                  <img src={wazeIcon} alt="" className="route-icon-img route-icon-img-waze" />
                </a>
                <a href={uberUrl} target="_blank" rel="noreferrer" className="route-icon-btn" title="Uber" aria-label="Abrir rota no Uber" onClick={() => trackAnalyticsEvent("route_app_click", { eventId: event.id, venueId: event.venueId, region: event.region, source: "event_detail", metadata: { provider: "uber" } })}>
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
