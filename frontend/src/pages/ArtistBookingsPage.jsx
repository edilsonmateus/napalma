import { useEffect, useState } from "react";
import ArtistBookingsPanel from "../components/artists/ArtistBookingsPanel";
import { getMyArtists } from "../services/artistWorkspace.service";
import BackLink from "../components/common/BackLink";

export default function ArtistBookingsPage() {
  const [artists, setArtists] = useState([]);
  const [artistId, setArtistId] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { getMyArtists().then((items) => { setArtists(items); if (items[0]) setArtistId(items[0].id); }).catch((error) => setMessage(error?.response?.data?.message || "Nao foi possivel carregar seus artistas.")); }, []);
  return <section className="screen artist-workspace-screen"><BackLink to="/settings">Voltar ao Hub de Gestão</BackLink><header className="page-header"><h2>Contratações</h2><p>Organize as oportunidades recebidas pelos seus perfis oficiais.</p></header>{message ? <p className="clean-card">{message}</p> : null}{artists.length ? <><div className="clean-card artist-workspace-picker"><label>Artista<select value={artistId} onChange={(event) => setArtistId(event.target.value)}>{artists.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><ArtistBookingsPanel artistId={artistId}/></> : <p className="empty">Nenhum perfil de artista sob sua gestão.</p>}</section>;
}
