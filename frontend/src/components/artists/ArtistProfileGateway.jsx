import { ArrowRight, Music2 } from "lucide-react";
import { Link } from "react-router-dom";
import VerifiedBadge from "../common/VerifiedBadge";

export default function ArtistProfileGateway({ artistId, artistName, verified = false, onClick }) {
  if (!artistId) return null;

  return (
    <Link
      to={`/artists/${artistId}`}
      className="artist-profile-gateway"
      aria-label={`Abrir perfil de ${artistName}`}
      onClick={onClick}
    >
      <span className="artist-profile-gateway-icon" aria-hidden="true"><Music2 size={19}/></span>
      <span className="artist-profile-gateway-copy">
        <small>Perfil do artista</small>
        <strong>{artistName}</strong>
        <span>Agenda, história e próximos sambas</span>
      </span>
      {verified ? <VerifiedBadge className="artist-profile-gateway-verified" title="Artista verificado" /> : null}
      <ArrowRight className="artist-profile-gateway-arrow" size={18} aria-hidden="true" />
    </Link>
  );
}
