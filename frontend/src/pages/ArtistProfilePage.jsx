import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { useArtistProfileQuery, useToggleArtistFollowMutation } from "../hooks/useEventsQuery";
import { useAuthStore } from "../store/authStore";
import VerifiedBadge from "../components/common/VerifiedBadge";

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
  const user = useAuthStore((state) => state.user);
  const { data: artist, isLoading } = useArtistProfileQuery(artistId);
  const toggleFollow = useToggleArtistFollowMutation();

  if (isLoading) return <p className="empty">Carregando perfil do artista...</p>;
  if (!artist) return <p className="empty">Artista não encontrado.</p>;

  const canFollow = Boolean(user);
  const isFollowing = Boolean(artist.isFollowing);
  const postsCount = artist.upcomingEvents?.length || 0;

  return (
    <section className="screen screen-decision artist-profile-screen">
      <button className="btn-link" onClick={() => navigate(-1)}>Voltar</button>
      <header className="artist-profile-header">
        <div className="artist-profile-avatar-wrap">
          {artist.imageUrl ? (
            <img src={artist.imageUrl} alt={artist.name} className="artist-profile-avatar" />
          ) : (
            <div className="artist-profile-avatar artist-profile-avatar-fallback" aria-hidden="true" />
          )}
        </div>
        <h2 className="artist-profile-title">
          {artist.name}
          {artist.isVerified ? <VerifiedBadge className="artist-verified-dot" title="Perfil oficial verificado" /> : null}
        </h2>
        <p className="artist-profile-bio">{artist.bio || "Perfil oficial do artista no 77Gira."}</p>
        <div className="artist-profile-stats">
          <p><strong>{artist.followersCount || 0}</strong> Seguidores</p>
          <p><strong>{postsCount}</strong> Shows</p>
        </div>
      </header>

      <div className="artist-profile-follow-row">
        {canFollow ? (
          <button
            className={`artist-follow-btn ${isFollowing ? "active" : ""}`}
            type="button"
            disabled={toggleFollow.isPending}
            onClick={() => toggleFollow.mutate({ artistId: artist.id, currentlyFollowing: isFollowing })}
          >
            {toggleFollow.isPending ? "Atualizando..." : (isFollowing ? "Seguindo" : "+ Follow")}
          </button>
        ) : (
          <Link to="/settings" className="artist-follow-btn">Entrar para seguir</Link>
        )}
      </div>

      <h3 className="section-title artist-profile-section-title">Próximos Shows</h3>
      {!artist.upcomingEvents?.length ? (
        <div className="empty empty-highlight">
          <p>Sem shows futuros cadastrados.</p>
          <small className="meta-line">Esse perfil oficial ainda não publicou a próxima agenda.</small>
          <Link to="/explore" className="chip">Ver sambas no Explorar</Link>
        </div>
      ) : null}
      <div className="artist-shows-list">
        {(artist.upcomingEvents || []).map((event) => (
          <Link key={event.id} to={`/events/${event.id}`} className="artist-show-row">
            <span className="artist-show-venue">{event.venue}</span>
            <span className="artist-show-time"><CalendarClock size={13} /> {formatDate(event.startsAt)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
