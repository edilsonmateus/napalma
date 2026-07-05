import { useEffect, useMemo, useState } from "react";
import { BarChart3, BriefcaseBusiness, ChevronRight, ExternalLink, Image, Megaphone, Music2, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { getMyArtists } from "../../services/artistWorkspace.service";
import { getMyAdvertiserAccounts } from "../../services/advertiserPortal.service";

const STORAGE_KEY = "77gira.config.hubGestao.collapsed";
const enabled = (name) => String(import.meta.env[name] || "").toLowerCase() === "true";

export default function ManagementHub({ user, canManageVenues, canManageAds }) {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; } });
  const [artists, setArtists] = useState([]);
  const [artistId, setArtistId] = useState("");
  const [advertiserAccounts, setAdvertiserAccounts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    const requests = [];
    if (enabled("VITE_ARTIST_SELF_SERVICE_ENABLED")) requests.push(getMyArtists().then((items) => { setArtists(items); setArtistId((current) => current || items[0]?.id || ""); }).catch(() => {}));
    if (enabled("VITE_ADS_ADVERTISER_ACCOUNTS_ENABLED")) requests.push(getMyAdvertiserAccounts().then(setAdvertiserAccounts).catch(() => {}));
    Promise.all(requests).finally(() => setLoaded(true));
  }, [user?.id]);

  const artist = artists.find((item) => item.id === artistId) || artists[0];
  const cards = useMemo(() => {
    const items = [];
    if (artist) {
      if (enabled("VITE_ARTIST_SELF_SERVICE_ENABLED")) items.push({ to: "/workspace/artista", icon: Music2, title: "Meu perfil de artista", description: "Gerencie bio, foto, capa, agenda, links oficiais e informações para contratantes.", action: "Abrir perfil", badge: "Principal", chip: "Perfil" });
      if (enabled("VITE_ARTIST_BOOKING_REQUESTS_ENABLED")) items.push({ to: "/workspace/artista/contratacoes", icon: BriefcaseBusiness, title: "Contratações", description: "Acompanhe solicitações, oportunidades, mensagens e status de negociação.", action: "Ver solicitações", badge: "Leads", chip: "Contratações" });
      if (enabled("VITE_ARTIST_MEDIA_GALLERY_ENABLED")) items.push({ to: "/workspace/artista/midia", icon: Image, title: "Fotos e vídeos", description: "Atualize imagens, vídeos e materiais de divulgação do perfil profissional.", action: "Gerenciar mídia", badge: "Mídia", chip: "Mídia" });
      if (enabled("VITE_ARTIST_INSIGHTS_ENABLED")) items.push({ to: "/workspace/artista/desempenho", icon: BarChart3, title: "Desempenho", description: "Veja visitas, cliques, seguidores e sinais de interesse do público.", action: "Ver métricas", badge: "Métricas", chip: "Métricas" });
      items.push({ to: `/artistas/${artist.slug || artist.id}`, icon: ExternalLink, title: "Mídia kit público", description: "Abra o perfil profissional para enviar a casas, imprensa e contratantes.", action: "Abrir EPK", badge: "EPK", chip: "EPK" });
    }
    if (advertiserAccounts.length) items.push({ to: "/workspace/anunciante", icon: Megaphone, title: "Central do Anunciante", description: "Crie campanhas, acompanhe anúncios e impulsione eventos, artistas ou casas.", action: "Abrir central", badge: "Ads", chip: "Ads" });
    if (canManageVenues) items.push({ to: "/settings/venues", icon: Store, title: "Gestão de casas", description: "Administre casas de samba, programação e acessos operacionais.", action: "Gerenciar casas", badge: "Casas", chip: "Casas" });
    if (canManageAds) items.push({ to: "/settings/ads", icon: Megaphone, title: "Gestão de publicidade", description: "Revise campanhas, criativos, anunciantes e entregas da plataforma.", action: "Gerenciar Ads", badge: "Admin", chip: "Ads Admin" });
    return items;
  }, [advertiserAccounts.length, artist, canManageAds, canManageVenues]);

  function toggle() {
    const next = !collapsed; setCollapsed(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* armazenamento indisponível */ }
  }

  if (!user || !loaded) return null;
  if (!cards.length) return <aside className="settings-artist-invite"><strong>Você é artista?</strong><p>Reivindique seu perfil e transforme sua página em um mídia kit vivo.</p><Link to="/explore">Encontrar meu perfil</Link></aside>;

  return (
    <section className={`management-hub ${collapsed ? "is-collapsed" : ""}`}>
      <button className="management-hub-toggle" type="button" onClick={toggle} aria-expanded={!collapsed} aria-controls="managementHubContent">
        <ChevronRight className="management-hub-chevron" size={20}/>
        <span><strong>Hub de Gestão</strong><small>{collapsed ? `Gerenciando ${artist?.name || "seus ambientes"} · ${cards.length} ambientes disponíveis.` : "Acesse suas ferramentas de artista, anúncios e desempenho."}</small></span>
        <em className="management-hub-count">{cards.length} {cards.length === 1 ? "ferramenta" : "ferramentas"}</em>
      </button>
      {collapsed ? <div className="management-hub-summary" aria-hidden="false">{cards.map((card) => <span key={card.title}>{card.chip}</span>)}</div> : null}
      <div id="managementHubContent" className="management-hub-content" hidden={collapsed}>
        {artist ? <div className="management-hub-context"><span>Gerenciando</span>{artists.length > 1 ? <select value={artist.id} onChange={(event) => setArtistId(event.target.value)} aria-label="Artista gerenciado">{artists.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select> : <strong>{artist.name}</strong>}<small>Perfil reivindicado</small></div> : null}
        <div className="management-hub-grid">{cards.map(({ to, icon: Icon, title, description, action, badge }) => <Link to={to} className="management-card" key={title}><div className="management-card-heading"><Icon size={18}/><span>{badge}</span></div><strong>{title}</strong><p>{description}</p><em>{action} <ChevronRight size={14}/></em></Link>)}</div>
      </div>
    </section>
  );
}
