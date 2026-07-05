import { useEffect, useState } from "react";
import { BarChart3, CalendarDays, ExternalLink, Heart, Images, MessageSquare, Share2, Trophy } from "lucide-react";
import { getMyArtists } from "../services/artistWorkspace.service";
import { getArtistInsights } from "../services/artistInsights.service";

const cards = [
  ["profileViews", "Visitas ao perfil", BarChart3], ["newFollowers", "Novos seguidores", Heart],
  ["linkClicks", "Cliques nos links", ExternalLink], ["shares", "Compartilhamentos", Share2],
  ["bookingRequests", "Pedidos recebidos", MessageSquare], ["wonBookings", "Contratações ganhas", Trophy],
  ["upcomingEvents", "Próximos shows", CalendarDays], ["publishedMedia", "Mídias publicadas", Images]
];

export default function ArtistInsightsPage() {
  const [artists, setArtists] = useState([]); const [artistId, setArtistId] = useState("");
  const [days, setDays] = useState(30); const [insights, setInsights] = useState(null); const [message, setMessage] = useState("");
  useEffect(() => { getMyArtists().then((items) => { setArtists(items); if (items[0]) setArtistId(items[0].id); }).catch(() => setMessage("Não foi possível carregar seus artistas.")); }, []);
  useEffect(() => { if (!artistId) return; setInsights(null); getArtistInsights(artistId, days).then(setInsights).catch((error) => setMessage(error?.response?.data?.message || "Não foi possível carregar os insights.")); }, [artistId, days]);
  return (
    <section className="screen artist-insights-screen">
      <header className="page-header"><h2>Desempenho do artista</h2><p>Entenda como o público encontra, compartilha e demonstra interesse pelo perfil.</p></header>
      {message ? <p className="clean-card">{message}</p> : null}
      {artists.length ? <div className="clean-card artist-insights-filters"><label>Artista<select value={artistId} onChange={(event) => setArtistId(event.target.value)}>{artists.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Período<select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option><option value={365}>12 meses</option></select></label></div> : <p className="empty">Nenhum perfil sob sua gestão.</p>}
      {artistId && !insights ? <p className="empty">Carregando desempenho...</p> : null}
      {insights ? <><div className="artist-insights-grid">{cards.map(([key, label, Icon]) => <article className="clean-card" key={key}><Icon size={18}/><strong>{insights.summary[key] || 0}</strong><span>{label}</span></article>)}</div><section className="clean-card artist-insights-note"><h3>Sinais de oportunidade</h3><p>{insights.summary.bookingClicks || 0} pessoas abriram o contato para shows e {insights.summary.mediaClicks || 0} interagiram com mídias neste período.</p><small>Os dados são privados e visíveis apenas para quem administra o artista.</small></section></> : null}
    </section>
  );
}
