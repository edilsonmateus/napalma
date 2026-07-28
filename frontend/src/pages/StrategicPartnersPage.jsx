import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Handshake } from "lucide-react";
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../services/api";
import { listPublicStrategicPartners } from "../services/strategicPartners.service";

export default function StrategicPartnersPage() {
  const [partners, setPartners] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    listPublicStrategicPartners()
      .then((items) => { setPartners(items); setStatus("ready"); })
      .catch(() => setStatus("error"));
  }, []);

  return <main className="strategic-partners-page">
    <div className="strategic-partners-shell">
      <Link className="strategic-partners-back" to="/settings"><ArrowLeft size={16}/> Voltar</Link>
      <header className="strategic-partners-hero">
        <span><Handshake size={16}/> PARCERIAS ESTRATÉGICAS</span>
        <h1>Parceiros que fazem o samba girar.</h1>
        <p>Relações que ampliam a cultura, fortalecem a cena e respeitam a autonomia de cada roda.</p>
      </header>
      <section className="strategic-partners-principles" aria-label="Princípios das parcerias">
        <p>Parcerias não interferem na curadoria cultural do 77Gira.</p>
        <p>Não promovemos apostas, jogos de azar ou práticas incompatíveis com a comunidade.</p>
        <p>Quando houver relação comercial ou apoio institucional, isso é tratado com transparência.</p>
      </section>
      {status === "loading" ? <p className="strategic-partners-status">Carregando parceiros…</p> : null}
      {status === "error" ? <p className="strategic-partners-status">Não foi possível carregar parceiros agora. Tente novamente mais tarde.</p> : null}
      {status === "ready" && !partners.length ? <p className="strategic-partners-status">Novas parcerias serão apresentadas aqui em breve.</p> : null}
      <section className="strategic-partners-grid" aria-label="Parceiros ativos">
        {partners.map((partner) => {
          const content = <>
            <div className="strategic-partner-logo">{partner.logoUrl ? <img src={resolveMediaUrl(partner.logoUrl)} alt={`Logo ${partner.name}`}/> : <span>{partner.name.slice(0, 2).toUpperCase()}</span>}</div>
            <div><h2>{partner.name}</h2>{partner.publicDescription ? <p>{partner.publicDescription}</p> : null}</div>
            {partner.destinationUrl ? <ExternalLink size={16} aria-hidden="true"/> : null}
          </>;
          return partner.destinationUrl ? <a className="strategic-partner-card" href={partner.destinationUrl} target="_blank" rel="noreferrer" key={partner.id}>{content}</a> : <article className="strategic-partner-card" key={partner.id}>{content}</article>;
        })}
      </section>
    </div>
  </main>;
}
