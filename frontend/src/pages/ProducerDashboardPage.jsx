import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import VerifiedBadge from "../components/common/VerifiedBadge";
import useClaimLegalAcknowledgement from "../hooks/useClaimLegalAcknowledgement";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("section") || "overview";
  const producerName = user?.firstName?.trim() || user?.username?.trim() || "Produtor";
  const [claimType, setClaimType] = useState("venue");
  const [claimTargetId, setClaimTargetId] = useState("");
  const [claimJustification, setClaimJustification] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");
  const [claimantDocument, setClaimantDocument] = useState("");
  const [relationshipRole, setRelationshipRole] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [officialInstagram, setOfficialInstagram] = useState("");
  const [officialWebsite, setOfficialWebsite] = useState("");
  const [claimFeedback, setClaimFeedback] = useState("");
  const { data: venues = [], isLoading: venuesLoading } = useVenuesQuery();
  const { data: artists = [], isLoading: artistsLoading } = useArtistsQuery();
  const { data: claimVenues = [] } = useVenuesQuery({ scope: "public" });
  const { data: claimArtists = [] } = useArtistsQuery({ scope: "public" });
  const { data: events = [], isLoading: eventsLoading } = useEventsQuery();
  const { data: audienceSummary } = useAudienceSummaryQuery({ days: 30 }, true);
  const { data: myClaims = [] } = useMyClaimsQuery(true);
  const createClaim = useCreateClaimMutation();
  const { requestAcknowledgement, claimLegalModal } = useClaimLegalAcknowledgement();
  const { data: pendingClaims = [] } = useClaimsQuery("pending", true);

  const loading = venuesLoading || artistsLoading || eventsLoading;
  const nextEvents = [...events]
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 5);
  const claimOptions = claimType === "venue" ? claimVenues : claimArtists;
  const showOverview = activeSection === "overview";
  const showClaims = activeSection === "claims";
  const showQueue = activeSection === "queue";
  const showEvents = activeSection === "events";

  function clearProducerFilters() {
    setSearchParams({ section: "overview" });
    setClaimType("venue");
    setClaimTargetId("");
    setClaimJustification("");
    setResponsibleName("");
    setResponsiblePhone("");
    setClaimantDocument("");
    setRelationshipRole("");
    setOfficialEmail("");
    setOfficialInstagram("");
    setOfficialWebsite("");
    setClaimFeedback("");
  }

  async function handleCreateClaim(event) {
    event.preventDefault();
    if (!claimTargetId) {
      setClaimFeedback("Selecione uma casa ou artista para reivindicar.");
      return;
    }
    const legalAcknowledgement = await requestAcknowledgement();
    if (!legalAcknowledgement) return;
    try {
      setClaimFeedback("");
      await createClaim.mutateAsync({
        targetType: claimType,
        legalAcknowledgement,
        venueId: claimType === "venue" ? claimTargetId : undefined,
        artistId: claimType === "artist" ? claimTargetId : undefined,
        justification: claimJustification || undefined,
        responsibleName: responsibleName || undefined,
        responsiblePhone: responsiblePhone || undefined,
        claimantDocument: claimantDocument || undefined,
        relationshipRole: relationshipRole || undefined,
        officialEmail: officialEmail || undefined,
        officialInstagram: officialInstagram || undefined,
        officialWebsite: officialWebsite || undefined
      });
      setClaimFeedback("Reivindicação enviada para analise do admin.");
      setClaimTargetId("");
      setClaimJustification("");
      setResponsibleName("");
      setResponsiblePhone("");
      setClaimantDocument("");
      setRelationshipRole("");
      setOfficialEmail("");
      setOfficialInstagram("");
      setOfficialWebsite("");
    } catch (error) {
      setClaimFeedback(error?.response?.data?.message || "Não foi possivel enviar reivindicação.");
    }
  }

  return (
    <section className="screen screen-history">
      {claimLegalModal}
      <header className="page-header admin-page-header">
        <div className="admin-page-header-main">
          <h2>Painel do Produtor</h2>
          <p>Bem-vindo, {producerName}. Vamos agitar esta cidade?</p>
          <div className="role-session-wrap">
            <div className="role-session-badge">Perfil ativo: {(user?.role || "producer").toUpperCase()}</div>
            <span className="role-live-indicator" aria-label="Perfil ativo ao vivo">LIVE</span>
          </div>
        </div>
        <img src="/assets/brand/icon_mono_77Gira.svg" alt="77Gira" className="admin-page-icon" />
      </header>

      {loading ? <p className="empty">Carregando painel...</p> : null}

      <div className="ads-layout">
        <aside className="ads-sidebar">
          <button className={`chip ${activeSection === "overview" ? "active" : ""}`} onClick={() => setSearchParams({ section: "overview" })}>
            Visão Geral
          </button>
          <button className={`chip ${activeSection === "claims" ? "active" : ""}`} onClick={() => setSearchParams({ section: "claims" })}>
            Reivindicar carteira
          </button>
          <button className={`chip ${activeSection === "queue" ? "active" : ""}`} onClick={() => setSearchParams({ section: "queue" })}>
            Minhas reivindicacoes
          </button>
          <button className={`chip ${activeSection === "events" ? "active" : ""}`} onClick={() => setSearchParams({ section: "events" })}>
            Próximos eventos
          </button>
          <button className="chip" onClick={clearProducerFilters}>
            Limpar filtros
          </button>
        </aside>

        <div className="ads-content">
          {!loading ? (
            <div className="admin-kpis">
              <article className="clean-card">
                <h4>Casas</h4>
                <p>{venues.length}</p>
              </article>
              <article className="clean-card">
                <h4>Artistas</h4>
                <p>{artists.length}</p>
              </article>
              <article className="clean-card">
                <h4>Eventos</h4>
                <p>{events.length}</p>
              </article>
              <article className="clean-card">
                <h4>Semana</h4>
                <p>{eventsThisWeek(events)}</p>
              </article>
              <article className="clean-card">
                <h4>Público ativo (30d)</h4>
                <p>{audienceSummary?.global?.activeAudience ?? 0}</p>
              </article>
              <article className="clean-card">
                <h4>Base cadastrada</h4>
                <p>{audienceSummary?.global?.registeredUsers ?? 0}</p>
              </article>
              <article className="clean-card">
                <h4>Conversao (30d)</h4>
                <p>{audienceSummary?.global?.conversionRate ?? 0}%</p>
              </article>
              <article className="clean-card">
                <h4>Radar (carteira)</h4>
                <p>{audienceSummary?.scoped?.radarUsers ?? 0}</p>
              </article>
            </div>
          ) : null}

          <div className="admin-shortcuts producer-shortcuts">
            <Link to="/settings/venues" className="btn-primary">Abrir Gestão Completa</Link>
            <Link to="/settings/venues?section=events" className="chip">Criar Evento</Link>
          </div>

          {showOverview ? (
            <article className="clean-card admin-overview-card">
              <h4>Visão Geral do Produtor</h4>
              <p className="meta-line">Use o menu lateral para reivindicar carteira, acompanhar suas solicitações e acessar os próximos eventos.</p>
            </article>
          ) : null}

          {showClaims ? (
            <>
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
                  placeholder="Justificativa: contrato, parceria, gestão de agenda..."
                  rows={2}
                  required
                />
                <input
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  placeholder="Nome do responsavel legal"
                  required
                />
                <input
                  value={responsiblePhone}
                  onChange={(e) => setResponsiblePhone(e.target.value)}
                  placeholder="Telefone de contato"
                  required
                />
                <input
                  value={claimantDocument}
                  onChange={(e) => setClaimantDocument(e.target.value)}
                  placeholder="CNPJ/CPF do solicitante"
                  required
                />
                <input
                  value={relationshipRole}
                  onChange={(e) => setRelationshipRole(e.target.value)}
                  placeholder="Vinculo com a casa/artista (socio, produtor oficial...)"
                  required
                />
                <input
                  type="email"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  placeholder="Email oficial (opcional)"
                />
                <input
                  value={officialInstagram}
                  onChange={(e) => setOfficialInstagram(e.target.value)}
                  placeholder="Instagram oficial (opcional)"
                />
                <input
                  type="url"
                  value={officialWebsite}
                  onChange={(e) => setOfficialWebsite(e.target.value)}
                  placeholder="Site oficial (opcional)"
                />
                <button className="btn-primary" type="submit" disabled={createClaim.isPending}>
                  {createClaim.isPending ? "Enviando..." : "Enviar reivindicação"}
                </button>
              </form>
              {claimFeedback ? <p className="empty">{claimFeedback}</p> : null}
            </>
          ) : null}

          {showQueue ? (
            <>
              <h3 className="section-title">Status das reivindicacoes</h3>
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
            </>
          ) : null}

          {showEvents ? (
            <>
              <h3 className="section-title">Próximos eventos</h3>
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
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}



