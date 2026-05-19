import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import VerifiedBadge from "../components/common/VerifiedBadge";
import {
  useArtistsQuery,
  useAudienceSummaryQuery,
  useClaimsQuery,
  useCreateClaimMutation,
  useEventsQuery,
  useMyClaimsQuery,
  useVenuesQuery
} from "../hooks/useEventsQuery";

function upcomingCount(events) {
  const now = Date.now();
  return events.filter((event) => new Date(event.startsAt).getTime() >= now).length;
}

function eventsThisWeek(events) {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + 7);
  return events.filter((event) => {
    const time = new Date(event.startsAt).getTime();
    return time >= now.getTime() && time <= end.getTime();
  }).length;
}

export default function ProducerDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [claimType, setClaimType] = useState("venue");
  const [claimTargetId, setClaimTargetId] = useState("");
  const [claimJustification, setClaimJustification] = useState("");
  const [claimFeedback, setClaimFeedback] = useState("");
  const { data: venues = [], isLoading: venuesLoading } = useVenuesQuery();
  const { data: artists = [], isLoading: artistsLoading } = useArtistsQuery();
  const { data: claimVenues = [] } = useVenuesQuery({ scope: "public" });
  const { data: claimArtists = [] } = useArtistsQuery({ scope: "public" });
  const { data: events = [], isLoading: eventsLoading } = useEventsQuery();
  const { data: audienceSummary } = useAudienceSummaryQuery(true);
  const { data: myClaims = [] } = useMyClaimsQuery(true);
  const createClaim = useCreateClaimMutation();
  const { data: pendingClaims = [] } = useClaimsQuery("pending", true);

  const loading = venuesLoading || artistsLoading || eventsLoading;
  const nextEvents = [...events]
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 5);
  const claimOptions = claimType === "venue" ? claimVenues : claimArtists;

  async function handleCreateClaim(event) {
    event.preventDefault();
    if (!claimTargetId) {
      setClaimFeedback("Selecione uma casa ou artista para reivindicar.");
      return;
    }
    try {
      setClaimFeedback("");
      await createClaim.mutateAsync({
        targetType: claimType,
        venueId: claimType === "venue" ? claimTargetId : undefined,
        artistId: claimType === "artist" ? claimTargetId : undefined,
        justification: claimJustification || undefined
      });
      setClaimFeedback("Reivindicacao enviada para analise do admin.");
      setClaimTargetId("");
      setClaimJustification("");
    } catch (error) {
      setClaimFeedback(error?.response?.data?.message || "Nao foi possivel enviar reivindicacao.");
    }
  }

  return (
    <section className="screen screen-history">
      <header className="page-header">
        <h2>Painel do Produtor</h2>
        <p>Visao geral rapida da operacao e atalhos de gestao.</p>
        <div className="role-session-badge">Perfil ativo: {(user?.role || "producer").toUpperCase()}</div>
      </header>

      {loading ? <p className="empty">Carregando painel...</p> : null}

      {!loading ? (
        <div className="clean-cards">
          <article className="clean-card">
            <h4>Casas</h4>
            <p>{venues.length} casas cadastradas</p>
          </article>
          <article className="clean-card">
            <h4>Artistas</h4>
            <p>{artists.length} artistas cadastrados</p>
          </article>
          <article className="clean-card">
            <h4>Eventos</h4>
            <p>{events.length} eventos totais</p>
            <small>{upcomingCount(events)} proximos</small>
          </article>
          <article className="clean-card">
            <h4>Semana</h4>
            <p>{eventsThisWeek(events)} sambas nos proximos 7 dias</p>
          </article>
          <article className="clean-card">
            <h4>Publico ativo (30d)</h4>
            <p>{audienceSummary?.activeAudience30d ?? 0} pessoas</p>
            <small>{audienceSummary?.activeVisitorsOnly30d ?? 0} visitantes + {audienceSummary?.activeRegistered30d ?? 0} logados</small>
          </article>
          <article className="clean-card">
            <h4>Base cadastrada</h4>
            <p>{audienceSummary?.registeredUsers ?? 0} contas</p>
          </article>
        </div>
      ) : null}

      <div className="admin-shortcuts">
        <Link to="/settings/venues" className="btn-primary">Abrir Gestao Completa</Link>
        <Link to="/settings/venues?section=events" className="chip">Criar Evento</Link>
      </div>

      <h3 className="section-title">Reivindicar carteira</h3>
      <form className="venue-form" onSubmit={handleCreateClaim}>
        <select value={claimType} onChange={(e) => { setClaimType(e.target.value); setClaimTargetId(""); }}>
          <option value="venue">Casa</option>
          <option value="artist">Artista</option>
        </select>
        <select value={claimTargetId} onChange={(e) => setClaimTargetId(e.target.value)} required>
          <option value="">Selecione para reivindicar</option>
          {claimOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <textarea
          value={claimJustification}
          onChange={(e) => setClaimJustification(e.target.value)}
          placeholder="Justificativa (opcional): contrato, parceria, gestão de agenda..."
          rows={2}
        />
        <button className="btn-primary" type="submit" disabled={createClaim.isPending}>
          {createClaim.isPending ? "Enviando..." : "Enviar reivindicacao"}
        </button>
      </form>
      {claimFeedback ? <p className="empty">{claimFeedback}</p> : null}

      <div className="clean-cards">
        <article className="clean-card">
          <h4>Minhas reivindicacoes</h4>
          <p>{myClaims.length} total</p>
          <small>{myClaims.filter((c) => c.status === "pending").length} pendentes</small>
        </article>
        <article className="clean-card">
          <h4>Fila de aprovacao</h4>
          <p>{pendingClaims.length} pendencias no admin</p>
        </article>
      </div>

      <h3 className="section-title">Proximos eventos</h3>
      {nextEvents.length === 0 ? <p className="empty">Sem eventos futuros no momento.</p> : null}
      <div className="venue-list">
        {nextEvents.map((event) => (
          <article key={event.id} className="venue-card">
            <div>
              <h3>{event.title}</h3>
              <p className="meta-line artist-inline-with-badge">
                <span>{event.artist}</span>
                {event.artistVerified ? <VerifiedBadge className="artist-verified-dot" title="Artista verificado" /> : null}
              </p>
              <p className="meta-line">{event.venue} - {event.region}</p>
            </div>
            <small className="meta-line">{new Date(event.startsAt).toLocaleString("pt-BR")}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
