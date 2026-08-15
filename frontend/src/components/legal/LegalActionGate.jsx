import { useEffect, useMemo, useState } from "react";
import { FileText, ShieldCheck, X } from "lucide-react";
import { acceptMyLegalDocuments } from "../../services/legalDocuments.service";

const COPY = {
  artist_claim: ["Antes de enviar a reivindicação", "O termo de gestão de perfil registra a responsabilidade sobre as informações enviadas."],
  venue_claim: ["Antes de reivindicar a casa", "O termo registra a responsabilidade sobre a gestão pública da casa e de sua programação."],
  advertiser_access: ["Antes de solicitar uma conta anunciante", "Os termos de publicidade definem a revisão comercial e as regras de veiculação do 77Gira."],
  advertiser_campaign: ["Antes de continuar com a campanha", "Os termos de publicidade definem responsabilidades sobre criativos, destino e entrega."],
  patacos_purchase: ["Antes de continuar com créditos", "O regulamento explica o uso de Patacos e Milipatacos, saldo e regras de consumo de mídia."],
  default: ["Documentos necessários", "Leia os documentos aplicáveis antes de concluir esta ação."]
};

function formatDate(value) {
  if (!value) return "data de vigência a definir";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

export default function LegalActionGate() {
  const [gate, setGate] = useState(null);
  const [checkedIds, setCheckedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const open = (event) => {
      const detail = event.detail || {};
      if (!Array.isArray(detail.requirements) || !detail.requirements.length) return;
      setGate(detail);
      setCheckedIds([]);
      setSubmitting(false);
      setError("");
    };
    window.addEventListener("77gira:legal-acceptance-required", open);
    return () => window.removeEventListener("77gira:legal-acceptance-required", open);
  }, []);

  const requirements = gate?.requirements || [];
  const [title, description] = COPY[gate?.context] || COPY.default;
  const allChecked = requirements.length > 0 && checkedIds.length === requirements.length;
  const selected = useMemo(() => new Set(checkedIds), [checkedIds]);

  function close() {
    if (!submitting) setGate(null);
  }

  function toggle(id) {
    if (submitting) return;
    setCheckedIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  }

  async function confirm() {
    if (!gate || !allChecked) return;
    setSubmitting(true);
    setError("");
    try {
      await acceptMyLegalDocuments({
        context: gate.context,
        versionIds: requirements.map((item) => item.id),
        source: "action_gate"
      });
      window.dispatchEvent(new CustomEvent("77gira:legal-acceptance-complete", { detail: { context: gate.context } }));
      setGate(null);
    } catch (requestError) {
      const message = requestError?.response?.data?.message;
      setError(message || "Não foi possível registrar o aceite agora. Atualize os documentos e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!gate) return null;

  return <div className="legal-action-gate-backdrop" role="presentation" onMouseDown={close}>
    <section className="legal-action-gate" role="dialog" aria-modal="true" aria-labelledby="legal-action-gate-title" onMouseDown={(event) => event.stopPropagation()}>
      <header>
        <span><ShieldCheck size={15} aria-hidden="true"/> ACEITE FORMAL</span>
        <button type="button" onClick={close} disabled={submitting} aria-label="Fechar leitura"><X size={18}/></button>
      </header>
      <div className="legal-action-gate-intro">
        <h2 id="legal-action-gate-title">{title}</h2>
        <p>{description}</p>
      </div>
      <div className="legal-action-gate-documents">
        {requirements.map((item) => <article key={item.id}>
          <div className="legal-action-gate-document-heading"><FileText size={16} aria-hidden="true"/><span>{item.title}</span></div>
          <small>Versão {item.versionLabel} · vigente desde {formatDate(item.effectiveAt)}</small>
          <div className="legal-action-gate-document-content">{item.contentText || "O conteúdo desta versão ainda não está disponível para leitura."}</div>
          <label><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)}/><span>Li e aceito esta versão do documento.</span></label>
        </article>)}
      </div>
      {error ? <p className="legal-action-gate-error">{error}</p> : null}
      <footer>
        <button type="button" className="legal-action-gate-later" onClick={close} disabled={submitting}>Agora não</button>
        <button type="button" className="legal-action-gate-confirm" onClick={confirm} disabled={!allChecked || submitting}>{submitting ? "Registrando aceite…" : "Registrar aceite e voltar à ação"}</button>
      </footer>
    </section>
  </div>;
}
