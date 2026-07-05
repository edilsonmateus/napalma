import { useEffect, useState } from "react";
import { getArtistBookings, updateArtistBookingStatus } from "../../services/artistBookings.service";

const STATUS = ["new", "in_conversation", "proposal_sent", "won", "lost", "archived", "spam"];
const LABEL = { new: "Nova", in_conversation: "Em conversa", proposal_sent: "Proposta enviada", won: "Fechada", lost: "Perdida", archived: "Arquivada", spam: "Spam" };

export default function ArtistBookingsPanel({ artistId }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  async function load() { if (!artistId) return; try { setItems(await getArtistBookings(artistId, filter)); } catch (error) { setMessage(error?.response?.data?.message || "Nao foi possivel carregar as oportunidades."); } }
  useEffect(() => { load(); }, [artistId, filter]);
  async function change(id, status) { try { await updateArtistBookingStatus(id, status); await load(); } catch (error) { setMessage(error?.response?.data?.message || "Nao foi possivel atualizar a oportunidade."); } }
  return <section className="clean-card artist-bookings-panel"><div className="admin-list-header"><div><h3>Oportunidades de contratacao</h3><p className="meta-line">Solicitacoes recebidas pelo seu EPK.</p></div><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">Todas</option>{STATUS.map((status) => <option key={status} value={status}>{LABEL[status]}</option>)}</select></div>{message ? <p>{message}</p> : null}{!items.length ? <p className="empty">Nenhuma solicitacao neste filtro.</p> : <div className="artist-booking-list">{items.map((item) => <article key={item.id} className="artist-booking-card"><div><strong>{item.requesterName}</strong><span className={`status-badge status-${item.status}`}>{LABEL[item.status]}</span></div><p>{item.eventType} · {item.city}{item.neighborhood ? `, ${item.neighborhood}` : ""}</p><p>{item.desiredDate ? new Date(item.desiredDate).toLocaleDateString("pt-BR") : "Data a combinar"}{item.estimatedAudience ? ` · ${item.estimatedAudience} pessoas` : ""}{item.budgetRange ? ` · ${item.budgetRange}` : ""}</p><blockquote>{item.message}</blockquote><p><a href={`mailto:${item.requesterEmail}`}>{item.requesterEmail}</a>{item.requesterPhone ? ` · ${item.requesterPhone}` : ""}</p><select value={item.status} onChange={(e) => change(item.id, e.target.value)}>{STATUS.map((status) => <option key={status} value={status}>{LABEL[status]}</option>)}</select></article>)}</div>}</section>;
}
