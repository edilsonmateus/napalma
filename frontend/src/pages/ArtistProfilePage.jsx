import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { CalendarClock, ExternalLink, MapPin, Share2 } from "lucide-react";
import { useArtistProfileQuery, useCreateClaimMutation, useToggleArtistFollowMutation } from "../hooks/useEventsQuery";
import { useAuthStore } from "../store/authStore";
import VerifiedBadge from "../components/common/VerifiedBadge";
import ArtistBookingModal from "../components/artists/ArtistBookingModal";
import ArtistGallery from "../components/artists/ArtistGallery";
import RelatedArtists from "../components/artists/RelatedArtists";
import { trackAnalyticsEvent } from "../services/analytics.service";
import BackLink from "../components/common/BackLink";
import useClaimLegalAcknowledgement from "../hooks/useClaimLegalAcknowledgement";

function enabled(flagName) {
  return String(import.meta.env[flagName] || "").toLowerCase() === "true";
}

function formatDate(value) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function ArtistProfilePage() {
  const { artistId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const cameFromManagementHub = location.state?.fromManagementHub === true;
  const user = useAuthStore((state) => state.user);
  const { data: artist, isLoading } = useArtistProfileQuery(artistId);
  const toggleFollow = useToggleArtistFollowMutation();
  const createClaim = useCreateClaimMutation();
  const { requestAcknowledgement, claimLegalModal } = useClaimLegalAcknowledgement();
  const [showClaim, setShowClaim] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [claim, setClaim] = useState({
    responsibleName: "",
    responsiblePhone: "",
    claimantDocument: "",
    relationshipRole: "",
    officialEmail: "",
    officialInstagram: "",
    officialWebsite: "",
    justification: ""
  });

  useEffect(() => {
    if (!artist?.id) return;
    trackAnalyticsEvent("artist_profile_view", { artistId: artist.id, source: "artist_epk" });
  }, [artist?.id]);

  if (isLoading) return <p className="empty">Carregando perfil do artista...</p>;
  if (!artist) return <p className="empty">Artista não encontrado.</p>;

  const canFollow = Boolean(user);
  const isFollowing = Boolean(artist.isFollowing);
  const links = Object.entries(artist.links || {}).filter(([, value]) => value);
  const mediaGalleryEnabled = enabled("VITE_ARTIST_MEDIA_GALLERY_ENABLED");
  const bookingEnabled = enabled("VITE_ARTIST_BOOKING_REQUESTS_ENABLED");
  const hasOfficialEpk = Boolean(artist.isClaimed || artist.isVerified || artist.myAccess?.status === "active");

  async function shareEpk() {
    trackAnalyticsEvent("artist_epk_share", { artistId: artist.id, source: "artist_epk" });
    const url = `${window.location.origin}/artistas/${artist.slug || artist.id}`;
    if (navigator.share) {
      return navigator.share({
        title: `${artist.name} no 77Gira`,
        text: `Conheça o perfil de ${artist.name} no 77Gira.`,
        url
      }).catch(() => {});
    }
    await navigator.clipboard?.writeText(url);
    setClaimMessage("Link do perfil copiado.");
  }

  async function submitClaim(event) {
    event.preventDefault();
    const legalAcknowledgement = await requestAcknowledgement();
    if (!legalAcknowledgement) return;
    try {
      await createClaim.mutateAsync({
        targetType: "artist",
        artistId: artist.id,
        requestType: artist.isClaimed ? "team_access" : "ownership",
        ...claim,
        legalAcknowledgement,
        officialEmail: claim.officialEmail || undefined,
        officialInstagram: claim.officialInstagram || undefined,
        officialWebsite: claim.officialWebsite || undefined
      });
      setClaimMessage("Reivindicação enviada para análise.");
      setShowClaim(false);
    } catch (error) {
      setClaimMessage(error?.response?.data?.message || "Não foi possível enviar a reivindicação.");
    }
  }

  return (
    <section className="screen artist-epk-screen">
      {claimLegalModal}
      {cameFromManagementHub ? <BackLink to="/settings">Voltar ao Hub de Gestão</BackLink> : <BackLink onClick={() => navigate(-1)}>Voltar</BackLink>}

      <header className="artist-epk-hero">
        <div className="artist-epk-cover" style={artist.coverImageUrl ? { backgroundImage: `url(${artist.coverImageUrl})` } : undefined} />
        <div className="artist-epk-identity">
          {artist.imageUrl ? <img src={artist.imageUrl} alt={artist.name} className="artist-epk-avatar" /> : <div className="artist-epk-avatar artist-profile-avatar-fallback" />}
          <div className="artist-epk-heading">
            <h1>{artist.name}{artist.isVerified ? <VerifiedBadge title="Artista verificado" /> : null}</h1>
            {artist.shortBio ? <p>{artist.shortBio}</p> : null}
            <div className="artist-epk-tags">{(artist.genres || []).map((genre) => <span key={genre}>{genre}</span>)}</div>
          </div>
        </div>
        <div className="artist-epk-actions">
          {canFollow ? (
            <button className={`artist-epk-action ${isFollowing ? "active" : ""}`} onClick={() => toggleFollow.mutate({ artistId: artist.id, currentlyFollowing: isFollowing })}>
              {isFollowing ? "Seguindo" : "+ Seguir"}
            </button>
          ) : (
            <Link className="artist-epk-action" to="/login">Entrar para seguir</Link>
          )}
          <button className="artist-epk-action" type="button" onClick={shareEpk}><Share2 size={15} /> Compartilhar EPK</button>
          {bookingEnabled && artist.isVerified && artist.isClaimed ? (
            <button className="artist-epk-action artist-epk-action-primary" type="button" onClick={() => { trackAnalyticsEvent("artist_booking_click", { artistId: artist.id, source: "artist_epk" }); setShowBooking(true); }}>
              Contratar {artist.name}
            </button>
          ) : null}
        </div>
      </header>

      {claimMessage ? <p className="clean-card artist-epk-notice">{claimMessage}</p> : null}
      {artist.myAccess?.status === "active" ? (
        <aside className="clean-card artist-claim-cta">
          <div><strong>Você faz parte da equipe deste artista</strong><p>Acesse o Hub de Gestão para administrar o perfil e suas ferramentas.</p></div>
          <Link className="chip" to="/settings">Abrir Hub de Gestão</Link>
        </aside>
      ) : null}
      {!artist.myAccess && !artist.pendingClaim ? (
        <aside className="clean-card artist-claim-cta">
          <div>
            <strong>{artist.isClaimed ? "Este perfil já possui uma equipe" : "Este perfil ainda não foi reivindicado"}</strong>
            <p>{artist.isClaimed ? `Atualmente ${artist.teamCount || 1} pessoa(s) administram este artista. Se você faz parte da equipe, solicite acesso.` : "É você ou faz parte da equipe? Transforme este perfil em uma vitrine profissional oficial."}</p>
          </div>
          {user ? <button className="btn-primary" onClick={() => setShowClaim(true)}>{artist.isClaimed ? "Solicitar acesso à equipe" : "Reivindicar perfil"}</button> : <Link className="btn-primary" to="/login">Entrar para continuar</Link>}
        </aside>
      ) : null}
      {artist.pendingClaim ? (
        <aside className="clean-card artist-claim-cta">
          <div><strong>Solicitação em análise</strong><p>A equipe 77Gira está verificando as informações enviadas.</p></div>
        </aside>
      ) : null}

      <div className="artist-epk-stats">
        <article><strong>{artist.followersCount || 0}</strong><span>seguidores</span></article>
        <article><strong>{artist.eventsCount || 0}</strong><span>shows cadastrados</span></article>
        <article><strong>{artist.upcomingEvents?.length || 0}</strong><span>próximos shows</span></article>
      </div>

      {mediaGalleryEnabled && hasOfficialEpk ? <ArtistGallery items={artist.media} onMediaClick={(item) => trackAnalyticsEvent("artist_media_click", { artistId: artist.id, source: "artist_epk", metadata: { mediaId: item.id, type: item.type } })} /> : null}

      <div className="artist-epk-grid">
        <main>
          {(artist.fullBio || artist.bio) ? <section className="clean-card artist-epk-section"><h2>Sobre</h2><p className="artist-epk-release">{artist.fullBio || artist.bio}</p></section> : null}
          <section className="artist-epk-section">
            <h2>Próximos shows</h2>
            {!artist.upcomingEvents?.length ? <div className="empty">A próxima data ainda não foi publicada.</div> : (
              <div className="artist-epk-events">
                {artist.upcomingEvents.map((event) => (
                  <Link to={`/events/${event.id}`} key={event.id} className="clean-card artist-epk-event">
                    <div className="artist-epk-date"><strong>{new Date(event.startsAt).toLocaleDateString("pt-BR", { day: "2-digit" })}</strong><span>{new Date(event.startsAt).toLocaleDateString("pt-BR", { month: "short" })}</span></div>
                    <div><h3>{event.title}</h3><p><CalendarClock size={14} /> {formatDate(event.startsAt)}</p><p><MapPin size={14} /> {event.venue?.name} · {event.venue?.neighborhood || event.venue?.region}</p></div>
                  </Link>
                ))}
              </div>
            )}
          </section>
          {artist.pastEvents?.length ? <section className="artist-epk-section"><h2>Por onde já passou</h2><div className="artist-epk-history">{artist.pastEvents.map((event) => <Link to={`/events/${event.id}`} key={event.id}><strong>{event.venue?.name}</strong><span>{new Date(event.startsAt).toLocaleDateString("pt-BR")}</span></Link>)}</div></section> : null}
        </main>
        <aside className="artist-epk-aside">
          {hasOfficialEpk && (artist.baseCity || artist.baseState) ? <section className="clean-card"><h2>Base de atuação</h2><p><MapPin size={15} /> {[artist.baseCity, artist.baseState].filter(Boolean).join(" · ")}</p></section> : null}
          {hasOfficialEpk && artist.showFormats?.length ? <section className="clean-card"><h2>Formatos de show</h2><div className="artist-epk-tags">{artist.showFormats.map((item) => <span key={item}>{item}</span>)}</div>{artist.averageDurationMinutes ? <p>Duração média: {artist.averageDurationMinutes} min</p> : null}</section> : null}
          {hasOfficialEpk && links.length ? <section className="clean-card"><h2>Links oficiais</h2><div className="artist-epk-links">{links.map(([label, url]) => <a href={url} key={label} target="_blank" rel="noreferrer" onClick={() => trackAnalyticsEvent("artist_link_click", { artistId: artist.id, source: "artist_epk", metadata: { platform: label } })}>{label}<ExternalLink size={14} /></a>)}</div></section> : null}
        </aside>
      </div>

      <RelatedArtists items={artist.relatedArtists} />
      {showClaim ? (
        <div className="modal-backdrop">
          <form className="modal-card artist-claim-form" onSubmit={submitClaim}>
            <h3>{artist.isClaimed ? "Solicitar acesso a" : "Reivindicar"} {artist.name}</h3>
            <input required placeholder="Nome do responsável" value={claim.responsibleName} onChange={(e) => setClaim({ ...claim, responsibleName: e.target.value })} />
            <input required placeholder="Telefone" value={claim.responsiblePhone} onChange={(e) => setClaim({ ...claim, responsiblePhone: e.target.value })} />
            <input required placeholder="CPF ou CNPJ" value={claim.claimantDocument} onChange={(e) => setClaim({ ...claim, claimantDocument: e.target.value })} />
            <input required placeholder="Seu vínculo com o artista" value={claim.relationshipRole} onChange={(e) => setClaim({ ...claim, relationshipRole: e.target.value })} />
            <input type="email" placeholder="E-mail oficial (opcional)" value={claim.officialEmail} onChange={(e) => setClaim({ ...claim, officialEmail: e.target.value })} />
            <input placeholder="Instagram oficial (opcional)" value={claim.officialInstagram} onChange={(e) => setClaim({ ...claim, officialInstagram: e.target.value })} />
            <input type="url" placeholder="Site oficial (opcional)" value={claim.officialWebsite} onChange={(e) => setClaim({ ...claim, officialWebsite: e.target.value })} />
            <textarea required minLength={5} placeholder="Conte como podemos comprovar este vínculo" value={claim.justification} onChange={(e) => setClaim({ ...claim, justification: e.target.value })} />
            <div className="form-actions-inline"><button className="btn-primary" disabled={createClaim.isPending}>Enviar para análise</button><button className="chip" type="button" onClick={() => setShowClaim(false)}>Cancelar</button></div>
          </form>
        </div>
      ) : null}
      {showBooking ? <ArtistBookingModal artist={artist} onClose={() => setShowBooking(false)} onSuccess={() => setClaimMessage("Solicitação enviada para a equipe do artista.")} /> : null}
    </section>
  );
}
