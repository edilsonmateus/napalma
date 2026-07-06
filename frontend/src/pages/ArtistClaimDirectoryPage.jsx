import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users } from "lucide-react";
import BackLink from "../components/common/BackLink";
import VerifiedBadge from "../components/common/VerifiedBadge";
import { getArtists } from "../services/events.service";
import { decideMyArtistInvitation, getMyArtistInvitations } from "../services/artistTeam.service";
import { useCreateClaimMutation } from "../hooks/useEventsQuery";
import useClaimLegalAcknowledgement from "../hooks/useClaimLegalAcknowledgement";

function initialLetter(name) {
  return String(name || "#").normalize("NFD").replace(/[\u0300-\u036f]/g, "").charAt(0).toUpperCase() || "#";
}

export default function ArtistClaimDirectoryPage() {
  const [artists, setArtists] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showInclusion, setShowInclusion] = useState(false);
  const [inclusion, setInclusion] = useState({ artistName: "", genres: "", baseCity: "", baseState: "", responsibleName: "", responsiblePhone: "", claimantDocument: "", relationshipRole: "", justification: "" });
  const createClaim = useCreateClaimMutation();
  const { requestAcknowledgement, claimLegalModal } = useClaimLegalAcknowledgement();

  async function load({ preserveMessage = false } = {}) {
    setLoading(true);
    if (!preserveMessage) setMessage("");
    try {
      const artistItems = await getArtists({ scope: "public" });
      setArtists(artistItems);
      getMyArtistInvitations().then(setInvitations).catch(() => setInvitations([]));
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

  async function submitInclusion(event) {
    event.preventDefault();
    const legalAcknowledgement = await requestAcknowledgement();
    if (!legalAcknowledgement) return;
    try {
      await createClaim.mutateAsync({
        targetType: "artist",
        requestType: "artist_inclusion",
        legalAcknowledgement,
        responsibleName: inclusion.responsibleName,
        responsiblePhone: inclusion.responsiblePhone,
        claimantDocument: inclusion.claimantDocument,
        relationshipRole: inclusion.relationshipRole,
        justification: inclusion.justification,
        requestedChanges: {
          artistName: inclusion.artistName,
          genres: inclusion.genres.split(",").map((item) => item.trim()).filter(Boolean),
          baseCity: inclusion.baseCity,
          baseState: inclusion.baseState
        }
      });
      setShowInclusion(false);
      setMessage("Solicitação enviada para análise. Você poderá acompanhar o retorno pela sua conta.");
    } catch (error) { setMessage(error?.response?.data?.message || "Não foi possível enviar a solicitação."); }
  }

  return <section className="screen artist-directory-screen">
    {claimLegalModal}
    <BackLink to="/settings">Voltar para Configurações</BackLink>
    <header className="page-header"><h2>Encontre seu perfil artístico</h2><p>Busque em todo o catálogo, mesmo que o artista não esteja na programação desta semana.</p></header>
    {invitations.length ? <section className="clean-card artist-directory-invitations"><h3>Convites para equipes</h3>{invitations.map((invite) => <article key={invite.id}><div className="artist-directory-avatar">{invite.artist.imageUrl ? <img src={invite.artist.imageUrl} alt=""/> : <span>{initialLetter(invite.artist.name)}</span>}</div><div><strong>{invite.artist.name}</strong><small>Convite para atuar como {invite.role}</small></div><div className="form-actions-inline"><button className="chip" onClick={() => decideInvitation(invite.id, true)}>Aceitar</button><button className="chip" onClick={() => decideInvitation(invite.id, false)}>Recusar</button></div></article>)}</section> : null}
    <label className="artist-directory-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar artista, banda, gênero ou cidade"/></label>
    {message ? <p className="clean-card artist-directory-message">{message}</p> : null}
    {loading ? <p className="empty">Carregando artistas...</p> : null}
    {!loading && !filtered.length ? <div className="clean-card artist-directory-empty"><strong>Seu artista não está listado?</strong><p>Envie uma solicitação interna. A equipe verificará os dados antes de criar o perfil para evitar duplicidades.</p><button className="chip" type="button" onClick={() => setShowInclusion(true)}>Solicitar inclusão</button></div> : null}
    <div className="artist-directory-groups">{Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, "pt-BR")).map(([letter, items]) => <section key={letter}><h3>{letter}</h3><div className="artist-directory-list">{items.map((artist) => <article key={artist.id} className="artist-directory-row"><div className="artist-directory-avatar">{artist.imageUrl ? <img src={artist.imageUrl} alt="" loading="lazy"/> : <span>{initialLetter(artist.name)}</span>}</div><div className="artist-directory-identity"><strong>{artist.name}{artist.isVerified ? <VerifiedBadge title="Artista verificado"/> : null}</strong><small>{[(artist.genres || []).slice(0, 2).join(" · "), [artist.baseCity, artist.baseState].filter(Boolean).join(" - ")].filter(Boolean).join(" · ") || "Perfil artístico"}</small></div><div className="artist-directory-team"><span>{(artist.teamPreview || []).map((avatar, index) => <img key={`${avatar}-${index}`} src={avatar} alt=""/>)}{artist.teamCount > (artist.teamPreview || []).length ? <em>+{artist.teamCount - (artist.teamPreview || []).length}</em> : null}{!artist.teamCount ? <i><Users size={14}/></i> : null}</span><small>{artist.teamCount ? `${artist.teamCount} na equipe` : "Sem gestor"}</small></div><Link className="artist-directory-action" to={`/artistas/${artist.slug || artist.id}`}>{artist.myAccess ? "Abrir Hub" : artist.isClaimed ? "Solicitar acesso" : "Reivindicar"}</Link></article>)}</div></section>)}</div>
    {showInclusion ? <div className="modal-backdrop"><form className="modal-card artist-inclusion-form" onSubmit={submitInclusion}><h3>Solicitar inclusão de artista</h3><p>Preencha os dados para análise da equipe 77Gira.</p><input required minLength={2} placeholder="Nome artístico ou da banda" value={inclusion.artistName} onChange={(event) => setInclusion({ ...inclusion, artistName: event.target.value })}/><div className="artist-inclusion-grid"><input required placeholder="Cidade-base" value={inclusion.baseCity} onChange={(event) => setInclusion({ ...inclusion, baseCity: event.target.value })}/><input required maxLength={40} placeholder="Estado" value={inclusion.baseState} onChange={(event) => setInclusion({ ...inclusion, baseState: event.target.value })}/></div><input placeholder="Gêneros, separados por vírgula" value={inclusion.genres} onChange={(event) => setInclusion({ ...inclusion, genres: event.target.value })}/><input required placeholder="Nome do responsável" value={inclusion.responsibleName} onChange={(event) => setInclusion({ ...inclusion, responsibleName: event.target.value })}/><input required placeholder="Telefone ou WhatsApp" value={inclusion.responsiblePhone} onChange={(event) => setInclusion({ ...inclusion, responsiblePhone: event.target.value })}/><input required placeholder="CPF ou CNPJ" value={inclusion.claimantDocument} onChange={(event) => setInclusion({ ...inclusion, claimantDocument: event.target.value })}/><input required placeholder="Seu vínculo com o artista" value={inclusion.relationshipRole} onChange={(event) => setInclusion({ ...inclusion, relationshipRole: event.target.value })}/><textarea required minLength={5} placeholder="Conte como podemos confirmar o vínculo e a existência do artista" value={inclusion.justification} onChange={(event) => setInclusion({ ...inclusion, justification: event.target.value })}/><div className="form-actions-inline"><button className="btn-primary" disabled={createClaim.isPending}>{createClaim.isPending ? "Enviando..." : "Enviar para análise"}</button><button className="chip" type="button" onClick={() => setShowInclusion(false)}>Cancelar</button></div></form></div> : null}
  </section>;
}
