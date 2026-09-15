import { useEffect, useId, useState } from "react";
import { ArrowLeft, ExternalLink, Handshake } from "lucide-react";
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../services/api";
import { listPublicStrategicPartners } from "../services/strategicPartners.service";
import "../styles/strategic-partner-gallery.css";

const GROUPS = [
  ["operation", "Parceiros de operação", "Parceria de operação"],
  ["project", "Parceiros de projeto", "Parceria de projeto"],
  ["activation", "Parceiros de ativação", "Parceria de ativação"],
  ["institutional", "Parceiros institucionais", "Parceria institucional"],
  ["other", "Outras parcerias", "Outra parceria"]
];

function PartnerTile({ partner }) {
  const [expanded, setExpanded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const detailsId = useId();
  useEffect(() => setImageFailed(false), [partner.logoUrl]);
  let destination = null;
  try {
    const url = new URL(partner.destinationUrl);
    if (["https:", "http:"].includes(url.protocol)) destination = url.href;
  } catch { /* No external action without a valid public web URL. */ }
  return <article className={`partner-tile${expanded ? " is-expanded" : ""}`}>
    <button type="button" className="partner-tile-toggle" aria-expanded={expanded}
      aria-controls={detailsId} aria-label={expanded ? `Voltar ao logo de ${partner.name}` : `Conheça a parceria com ${partner.name}`}
      onClick={() => setExpanded((value) => !value)}>
      {!expanded ? <span className="partner-tile-logo">
        {partner.logoUrl && !imageFailed ? <img src={resolveMediaUrl(partner.logoUrl)} alt={partner.name} onError={() => setImageFailed(true)}/> : <span>{partner.name}</span>}
      </span> : null}
      <span className="partner-tile-action">{expanded ? "Voltar ao logo" : "Conheça a parceria"}</span>
    </button>
    <div id={detailsId} className="partner-tile-details" hidden={!expanded}>
      <h3>{partner.name}</h3>
      <p>{partner.publicDescription?.trim() || "Mais informações sobre esta parceria serão apresentadas em breve."}</p>
      {destination ? <a href={destination} target="_blank" rel="noopener noreferrer">Visitar parceiro <ExternalLink size={15} aria-hidden="true"/><span className="partner-sr-only"> (abre em outra aba)</span></a> : null}
    </div>
  </article>;
}

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
        <p>Se quer ir rápido, vá sozinho. Se quer ir longe, vá acompanhado.</p>
      </header>
      {status === "loading" ? <p className="strategic-partners-status">Carregando parceiros…</p> : null}
      {status === "error" ? <p className="strategic-partners-status">Não foi possível carregar parceiros agora. Tente novamente mais tarde.</p> : null}
      {status === "ready" && !partners.length ? <p className="strategic-partners-status">Novas parcerias serão apresentadas aqui em breve.</p> : null}
      {GROUPS.map(([type, title]) => {
        const items = partners.filter((partner) => type === "other"
          ? !GROUPS.slice(0, 4).some(([known]) => known === partner.partnershipType)
          : partner.partnershipType === type);
        return items.length ? <section className="partner-group" key={type} aria-labelledby={`partner-group-${type}`}>
          <h2 id={`partner-group-${type}`}>{title}</h2>
          <div className="partner-logo-grid">{items.map((partner) => <PartnerTile key={partner.id} partner={partner}/>)}</div>
        </section> : null;
      })}
    </div>
  </main>;
}
