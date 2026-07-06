import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users } from "lucide-react";
import BackLink from "../components/common/BackLink";
import VerifiedBadge from "../components/common/VerifiedBadge";
import { getArtists } from "../services/events.service";
import { decideMyArtistInvitation, getMyArtistInvitations } from "../services/artistTeam.service";

function initialLetter(name) {
  return String(name || "#").normalize("NFD").replace(/[\u0300-\u036f]/g, "").charAt(0).toUpperCase() || "#";
}

export default function ArtistClaimDirectoryPage() {
  const [artists, setArtists] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load({ preserveMessage = false } = {}) {
    setLoading(true);
    if (!preserveMessage) setMessage("");
    try {
      const [artistItems, invitationItems] = await Promise.all([getArtists({ scope: "public" }), getMyArtistInvitations()]);
      setArtists(artistItems);
      setInvitations(invitationItems);
    } catch (error) { setMessage(error?.response?.data?.message || "Não foi possível carregar os artistas."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return artists.filter((artist) => !term || `${artist.name} ${(artist.genres || []).join(" ")} ${artist.baseCity || ""}`.toLocaleLowerCase("pt-BR").includes(term));
  }, [artists, query]);
  const groups = useMemo(() => filtered.reduce((out, artist) => { const letter = initialLetter(artist.name); (out[letter] ||= []).push(artist); return out; }, {}), [filtered]);

  async function decideInvitation(id, accept) {
    try { await decideMyArtistInvitation(id, accept); setMessage(accept ? "Convite aceito. O artista já está no seu Hub de Gestão." : "Convite recusado."); await load({ preserveMessage: true }); }
    catch (error) { setMessage(error?.response?.data?.message || "Não foi possível responder ao convite."); }
  }

  return <section className="screen artist-directory-screen">
    <BackLink to="/settings">Voltar para Configurações</BackLink>
    <header className="page-header"><h2>Encontre seu perfil artístico</h2><p>Busque em todo o catálogo, mesmo que o artista não esteja na programação desta semana.</p></header>
    {invitations.length ? <section className="clean-card artist-directory-invitations"><h3>Convites para equipes</h3>{invitations.map((invite) => <article key={invite.id}><div className="artist-directory-avatar">{invite.artist.imageUrl ? <img src={invite.artist.imageUrl} alt=""/> : <span>{initialLetter(invite.artist.name)}</span>}</div><div><strong>{invite.artist.name}</strong><small>Convite para atuar como {invite.role}</small></div><div className="form-actions-inline"><button className="chip" onClick={() => decideInvitation(invite.id, true)}>Aceitar</button><button className="chip" onClick={() => decideInvitation(invite.id, false)}>Recusar</button></div></article>)}</section> : null}
    <label className="artist-directory-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar artista, banda, gênero ou cidade"/></label>
    {message ? <p className="clean-card artist-directory-message">{message}</p> : null}
    {loading ? <p className="empty">Carregando artistas...</p> : null}
    {!loading && !filtered.length ? <div className="clean-card artist-directory-empty"><strong>Seu artista não está listado?</strong><p>Peça a inclusão pelo suporte para evitar perfis duplicados.</p><a className="chip" href="mailto:77giramundo@gmail.com?subject=Inclusão de artista no 77Gira">Solicitar inclusão</a></div> : null}
    <div className="artist-directory-groups">{Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, "pt-BR")).map(([letter, items]) => <section key={letter}><h3>{letter}</h3><div className="artist-directory-list">{items.map((artist) => <article key={artist.id} className="artist-directory-row"><div className="artist-directory-avatar">{artist.imageUrl ? <img src={artist.imageUrl} alt="" loading="lazy"/> : <span>{initialLetter(artist.name)}</span>}</div><div className="artist-directory-identity"><strong>{artist.name}{artist.isVerified ? <VerifiedBadge title="Artista verificado"/> : null}</strong><small>{[(artist.genres || []).slice(0, 2).join(" · "), [artist.baseCity, artist.baseState].filter(Boolean).join(" - ")].filter(Boolean).join(" · ") || "Perfil artístico"}</small></div><div className="artist-directory-team"><span>{(artist.teamPreview || []).map((avatar, index) => <img key={`${avatar}-${index}`} src={avatar} alt=""/>)}{artist.teamCount > (artist.teamPreview || []).length ? <em>+{artist.teamCount - (artist.teamPreview || []).length}</em> : null}{!artist.teamCount ? <i><Users size={14}/></i> : null}</span><small>{artist.teamCount ? `${artist.teamCount} na equipe` : "Sem gestor"}</small></div><Link className="artist-directory-action" to={`/artistas/${artist.slug || artist.id}`}>{artist.myAccess ? "Abrir Hub" : artist.isClaimed ? "Solicitar acesso" : "Reivindicar"}</Link></article>)}</div></section>)}</div>
  </section>;
}
