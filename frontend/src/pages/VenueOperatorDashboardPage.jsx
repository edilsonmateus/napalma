import { Link } from "react-router-dom";
import { useEventsQuery, useVenueAdsSummaryQuery, useVenuesQuery } from "../hooks/useEventsQuery";
import { useAuthStore } from "../store/authStore";
import VerifiedBadge from "../components/common/VerifiedBadge";

function eventsToday(events) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  return events.filter((event) => {
    const t = new Date(event.startsAt);
    return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
  }).length;
}

export default function VenueOperatorDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { data: venues = [], isLoading: venuesLoading } = useVenuesQuery();
  const { data: events = [], isLoading: eventsLoading } = useEventsQuery();
  const { data: adsSummary, isLoading: adsLoading } = useVenueAdsSummaryQuery({ days: 30 }, true);

  const loading = venuesLoading || eventsLoading;
  const topVenues = venues.slice(0, 3);
  const venueNames = new Set(topVenues.map((venue) => venue.name));
  const relatedEvents = events
    .filter((event) => venueNames.has(event.venue))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 6);

  return (
    <section className="screen screen-radar">
      <header className="page-header admin-page-header">
        <div className="admin-page-header-main">
          <h2>Painel da Casa</h2>
          <p>Agenda da casa, próximos sambas e acesso rapido de operacao.</p>
          <div className="role-session-wrap">
            <div className="role-session-badge">Perfil ativo: {(user?.role || "venue_manager").toUpperCase()}</div>
            <span className="role-live-indicator" aria-label="Perfil ativo ao vivo">LIVE</span>
          </div>
        </div>
        <img src="/assets/brand/icon_mono_77Gira.svg" alt="77Gira" className="admin-page-icon" />
      </header>

      {loading ? <p className="empty">Carregando painel da casa...</p> : null}

      {!loading ? (
        <div className="clean-cards">
          <article className="clean-card">
            <h4>Casas em foco</h4>
            <p>{topVenues.length} exibidas para acompanhamento rapido</p>
          </article>
          <article className="clean-card">
            <h4>Eventos ligados</h4>
            <p>{relatedEvents.length} eventos próximos</p>
          </article>
          <article className="clean-card">
            <h4>Hoje</h4>
            <p>{eventsToday(relatedEvents)} evento(s) hoje</p>
          </article>
        </div>
      ) : null}

      <div className="admin-shortcuts">
        <Link to="/settings/venues?section=events" className="btn-primary">Abrir Agenda e Cadastro</Link>
        <Link to="/settings/venues?section=events" className="chip">Criar Evento</Link>
        <Link to="/settings/venues?section=managers" className="chip">Gerenciar Produtores</Link>
      </div>

      <h3 className="section-title">Próximos eventos da casa</h3>
      {relatedEvents.length === 0 ? <p className="empty">Sem eventos ligados as casas em foco.</p> : null}
      <div className="venue-list">
        {relatedEvents.map((event) => (
          <article key={event.id} className="venue-card">
            <div>
              <h3>{event.title}</h3>
              <p className="meta-line">{event.venue}</p>
              <p className="meta-line artist-inline-with-badge">
                <span>{event.artist}</span>
                {event.artistVerified ? <VerifiedBadge className="artist-verified-dot" title="Artista verificado" /> : null}
              </p>
            </div>
            <small className="meta-line">{new Date(event.startsAt).toLocaleString("pt-BR")}</small>
          </article>
        ))}
      </div>

      <h3 className="section-title">Ads da casa (30 dias)</h3>
      {adsLoading ? <p className="empty">Carregando métricas de anúncios...</p> : null}
      {!adsLoading ? (
        <div className="clean-cards">
          <article className="clean-card">
            <h4>Impressoes</h4>
            <p>{adsSummary?.summary?.impressions ?? 0}</p>
          </article>
          <article className="clean-card">
            <h4>Cliques</h4>
            <p>{adsSummary?.summary?.clicks ?? 0}</p>
          </article>
          <article className="clean-card">
            <h4>CTR</h4>
            <p>{adsSummary?.summary?.ctr ?? 0}%</p>
          </article>
        </div>
      ) : null}
      {!adsLoading && adsSummary?.slots?.length ? (
        <div className="venue-list">
          {adsSummary.slots.map((slot) => (
            <article key={slot.slot} className="venue-card">
              <div>
                <h3>{slot.slot === "venue_detail_inline" ? "Detalhe da Casa" : slot.slot === "radar_header" ? "Topo do Radar" : "Explorar (Card Grande)"}</h3>
                <p className="meta-line">{slot.impressions} impressoes • {slot.clicks} cliques</p>
              </div>
              <small className="meta-line">CTR {slot.ctr}%</small>
            </article>
          ))}
        </div>
      ) : null}
      {!adsLoading && adsSummary?.campaigns?.length ? (
        <>
          <h3 className="section-title">Top campanhas na sua casa</h3>
          <div className="venue-list">
            {adsSummary.campaigns.slice(0, 5).map((item) => (
              <article key={item.campaignId} className="venue-card">
                <div>
                  <h3>{item.campaignName}</h3>
                  <p className="meta-line">{item.advertiser}</p>
                  <p className="meta-line">{item.impressions} impressoes • {item.clicks} cliques</p>
                </div>
                <small className="meta-line">CTR {item.ctr}%</small>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}


