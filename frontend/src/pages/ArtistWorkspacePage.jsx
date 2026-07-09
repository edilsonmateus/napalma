import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyArtistProfile, getMyArtists, updateMyArtistProfile, uploadMyArtistImage } from "../services/artistWorkspace.service";
import VerifiedBadge from "../components/common/VerifiedBadge";
import BackLink from "../components/common/BackLink";

const EMPTY = { name: "", bio: "", imageUrl: "", genres: "", spotifyUrl: "", youtubeUrl: "", instagramUrl: "", coverImageUrl: "", shortBio: "", fullBio: "", baseCity: "", baseState: "SP", serviceRegions: "", showFormats: "", eventTypes: "", averageDurationMinutes: "", formation: "", availability: "", websiteUrl: "", tiktokUrl: "", whatsappUrl: "", soundcloudUrl: "", professionalEmail: "", professionalPhone: "", contactPreference: "" };
const list = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);

function buildArtistAdvertiserIntentUrl(artist) {
  const name = artist?.name || "Artista";
  const params = new URLSearchParams({
    source: "artist_workspace",
    type: "artist",
    objective: "other",
    name,
    accountName: name,
    campaignName: `EPK - ${name}`,
    message: `Quero destacar o perfil profissional/EPK de ${name} no 77Gira para ampliar alcance, agenda e oportunidades de contratação.`
  });
  return `/workspace/anunciante?${params.toString()}`;
}

export default function ArtistWorkspacePage() {
  const [artists, setArtists] = useState([]);
  const [artistId, setArtistId] = useState("");
  const [artist, setArtist] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { getMyArtists().then((items) => { setArtists(items); if (items[0]) setArtistId(items[0].id); }).catch((error) => setMessage(error?.response?.data?.message || "Nao foi possivel carregar seus perfis.")); }, []);
  useEffect(() => { if (!artistId) return; getMyArtistProfile(artistId).then((item) => { const p = item.professionalProfile || {}; setArtist(item); setForm({ ...EMPTY, name: item.name || "", bio: item.bio || "", imageUrl: item.imageUrl || "", genres: (item.genres || []).join(", "), spotifyUrl: item.spotifyUrl || "", youtubeUrl: item.youtubeUrl || "", instagramUrl: item.instagramUrl || "", ...Object.fromEntries(Object.keys(EMPTY).filter((key) => key in p).map((key) => [key, Array.isArray(p[key]) ? p[key].join(", ") : p[key] ?? ""])) }); }).catch((error) => setMessage(error?.response?.data?.message || "Nao foi possivel abrir o perfil.")); }, [artistId]);

  function change(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  async function upload(kind, file) {
    if (!file) return;
    setBusy(true);
    try { const asset = await uploadMyArtistImage({ artistId, file, kind }); setForm((current) => ({ ...current, [kind === "cover" ? "coverImageUrl" : "imageUrl"]: asset.publicUrl || asset.url })); setMessage("Imagem enviada. Salve o perfil para publicar."); }
    catch (error) { setMessage(error?.response?.data?.message || "Nao foi possivel enviar a imagem."); } finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault(); setBusy(true);
    try {
      const profileKeys = ["coverImageUrl", "shortBio", "fullBio", "baseCity", "baseState", "serviceRegions", "showFormats", "eventTypes", "averageDurationMinutes", "formation", "availability", "websiteUrl", "tiktokUrl", "whatsappUrl", "soundcloudUrl", "professionalEmail", "professionalPhone", "contactPreference"];
      const profile = Object.fromEntries(profileKeys.map((key) => [key, ["serviceRegions", "showFormats", "eventTypes"].includes(key) ? list(form[key]) : key === "averageDurationMinutes" ? (form[key] ? Number(form[key]) : null) : (form[key] || null)]));
      const updated = await updateMyArtistProfile(artistId, { name: form.name, bio: form.bio || null, imageUrl: form.imageUrl || null, genres: list(form.genres), spotifyUrl: form.spotifyUrl || null, youtubeUrl: form.youtubeUrl || null, instagramUrl: form.instagramUrl || null, profile });
      setArtist(updated); setMessage("EPK atualizado com sucesso.");
    } catch (error) { setMessage(error?.response?.data?.message || "Nao foi possivel salvar o EPK."); } finally { setBusy(false); }
  }

  return <section className="screen artist-workspace-screen"><BackLink to="/settings">Voltar ao Hub de Gestão</BackLink><header className="page-header"><h2>Meu perfil profissional</h2><p>Seu EPK vivo no 77Gira para público, casas e contratantes.</p></header>{message ? <p className="clean-card">{message}</p> : null}{!artists.length ? <div className="clean-card"><h3>Você ainda não administra um artista</h3><p>Abra o perfil público do artista e use “Reivindicar perfil”.</p><Link className="chip" to="/explore">Encontrar artistas e eventos</Link></div> : <><div className="clean-card artist-workspace-picker"><select value={artistId} onChange={(e) => setArtistId(e.target.value)}>{artists.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{artist?.isVerified ? <span><VerifiedBadge/> Perfil verificado</span> : null}<Link className="chip" to={`/artistas/${artist?.slug || artistId}`}>Ver EPK público</Link><Link className="chip artist-ads-entry-chip" to={buildArtistAdvertiserIntentUrl(artist)}>Destacar EPK</Link></div><aside className="clean-card artist-ads-entry-card"><div><span className="eyebrow">77Gira Ads</span><strong>Leve seu perfil profissional para mais casas e contratantes.</strong><p className="meta-line">Crie uma solicitação de anunciante do tipo artista. Nada entra no ar automaticamente: campanhas e criativos passam por revisão 77Gira.</p></div><Link className="btn-primary" to={buildArtistAdvertiserIntentUrl(artist)}>Promover perfil</Link></aside><form className="artist-workspace-form" onSubmit={save}><section className="clean-card"><h3>Identidade</h3><label>Nome artístico<input required name="name" value={form.name} onChange={change}/></label><label>Foto de perfil<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => upload("avatar", e.target.files?.[0])}/></label>{form.imageUrl ? <img className="artist-workspace-avatar" src={form.imageUrl} alt="Prévia do avatar"/> : null}<label>Imagem de capa<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => upload("cover", e.target.files?.[0])}/></label>{form.coverImageUrl ? <img className="artist-workspace-cover" src={form.coverImageUrl} alt="Prévia da capa"/> : null}<label>Gêneros, separados por vírgula<input name="genres" value={form.genres} onChange={change}/></label><div className="artist-workspace-inline"><label>Cidade-base<input name="baseCity" value={form.baseCity} onChange={change}/></label><label>Estado<input name="baseState" value={form.baseState} onChange={change}/></label></div></section><section className="clean-card"><h3>Apresentação</h3><label>Bio curta<textarea maxLength={320} name="shortBio" value={form.shortBio} onChange={change}/><small>{form.shortBio.length}/320</small></label><label>Release completo<textarea rows={9} name="fullBio" value={form.fullBio} onChange={change}/></label><label>Bio legada<textarea name="bio" value={form.bio} onChange={change}/></label></section><section className="clean-card"><h3>Para contratantes</h3><label>Formatos de show<input name="showFormats" value={form.showFormats} onChange={change} placeholder="Trio, banda completa, roda de samba"/></label><label>Tipos de evento<input name="eventTypes" value={form.eventTypes} onChange={change} placeholder="Casamento, corporativo, festival"/></label><label>Regiões atendidas<input name="serviceRegions" value={form.serviceRegions} onChange={change}/></label><label>Duração média (minutos)<input type="number" min="15" max="600" name="averageDurationMinutes" value={form.averageDurationMinutes} onChange={change}/></label><label>Formação<input name="formation" value={form.formation} onChange={change}/></label><label>Disponibilidade<textarea name="availability" value={form.availability} onChange={change}/></label><label>E-mail profissional<input type="email" name="professionalEmail" value={form.professionalEmail} onChange={change}/></label><label>Telefone profissional<input name="professionalPhone" value={form.professionalPhone} onChange={change}/></label><label>Preferência de contato<input name="contactPreference" value={form.contactPreference} onChange={change}/></label></section><section className="clean-card"><h3>Links oficiais</h3>{[["spotifyUrl","Spotify"],["youtubeUrl","YouTube"],["instagramUrl","Instagram"],["websiteUrl","Site"],["tiktokUrl","TikTok"],["soundcloudUrl","SoundCloud"],["whatsappUrl","WhatsApp profissional"]].map(([name,label]) => <label key={name}>{label}<input type="url" name={name} value={form[name]} onChange={change}/></label>)}</section><div className="artist-workspace-save"><button className="btn-primary" disabled={busy}>{busy ? "Salvando..." : "Salvar EPK"}</button></div></form></>}</section>;
}
