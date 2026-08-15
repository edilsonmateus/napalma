import { useEffect, useState } from "react";
import { FileText, RefreshCw, ShieldCheck, X } from "lucide-react";
import { acceptMyLegalDocuments, getMyLegalDocuments } from "../../services/legalDocuments.service";

const CATEGORY_LABELS = {
  terms_of_use: "Termos de Uso",
  privacy_cookies: "Política de Privacidade e Cookies",
  content_moderation: "Política de Conteúdo, Moderação e Denúncias",
  claim_management: "Termo de Reivindicação e Gestão de Perfil",
  advertising_terms: "Termos de Publicidade",
  patacos_policy: "Regulamento de Patacos e Milipatacos",
  partnership_terms: "Termos de Parceria",
  internal_operations: "Termos internos de operação"
};

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function MyLegalDocumentsCard() {
  const [state, setState] = useState({ loading: true, error: "", acceptances: [], requirements: [] });
  const [openRequirement, setOpenRequirement] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [accepting, setAccepting] = useState(false);

  async function load() {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await getMyLegalDocuments();
      setState({ loading: false, error: "", acceptances: data.acceptances || [], requirements: data.requirementsByContext?.account_review || [] });
    } catch (_error) {
      setState({ loading: false, error: "Não foi possível carregar seus registros agora.", acceptances: [], requirements: [] });
    }
  }

  useEffect(() => { load(); }, []);

  async function acceptRequirement() {
    if (!openRequirement || !confirmed) return;
    setAccepting(true);
    try {
      await acceptMyLegalDocuments({
        context: "account_review",
        versionIds: state.requirements.map((item) => item.id),
      });
      setOpenRequirement(null);
      setConfirmed(false);
      await load();
    } catch (_error) {
      setState((current) => ({ ...current, error: "Não foi possível registrar o aceite agora. Tente novamente." }));
    } finally {
      setAccepting(false);
    }
  }

  return <section className="account-settings-section account-legal-documents-section">
    <div className="account-settings-section-title">
      <div><strong>Documentos e aceites</strong><small>Consulte os documentos aceitos e seus registros de versão.</small></div>
      <ShieldCheck size={18} aria-hidden="true" />
    </div>
    <p className="account-legal-documents-note">Preferências como lembretes e personalização continuam sendo escolhas independentes. Quando um documento necessário estiver publicado, seu aceite será pedido apenas no momento adequado.</p>
    {state.loading ? <small className="account-legal-documents-loading">Carregando registros…</small> : null}
    {state.error ? <div className="account-legal-documents-error"><span>{state.error}</span><button type="button" onClick={load} aria-label="Tentar carregar documentos novamente"><RefreshCw size={14}/> Tentar novamente</button></div> : null}
    {!state.loading && !state.error && state.acceptances.length === 0 ? <div className="account-legal-documents-empty"><FileText size={17}/><span>Nenhum aceite documental registrado para esta conta ainda.</span></div> : null}
    {state.requirements.length > 0 ? <div className="account-legal-documents-required">
      <strong>Há documento{state.requirements.length > 1 ? "s" : ""} aguardando seu aceite</strong>
      {state.requirements.map((item) => <button type="button" key={item.id} onClick={() => { setOpenRequirement(item); setConfirmed(false); }}>{item.title} · versão {item.versionLabel}</button>)}
    </div> : null}
    {!state.loading && state.acceptances.length > 0 ? <ul className="account-legal-documents-list">
      {state.acceptances.map((item) => <li key={item.id}><span><strong>{CATEGORY_LABELS[item.document?.category] || item.document?.title || "Documento 77Gira"}</strong><small>Versão {item.versionLabel} · aceita em {formatDate(item.acceptedAt)}</small></span><ShieldCheck size={16} aria-label="Aceite registrado"/></li>)}
    </ul> : null}
    {openRequirement ? <div className="account-legal-dialog-backdrop" role="presentation" onMouseDown={() => !accepting && setOpenRequirement(null)}>
      <section className="account-legal-dialog" role="dialog" aria-modal="true" aria-labelledby="legal-document-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="account-legal-dialog-close" type="button" disabled={accepting} onClick={() => setOpenRequirement(null)} aria-label="Fechar leitura"><X size={17}/></button>
        <span>DOCUMENTOS 77GIRA</span>
        <h3 id="legal-document-title">Documentos aplicáveis à sua conta</h3>
        <p>Leia as versões vigentes antes de registrar o aceite.</p>
        <article>
          {state.requirements.map((item) => <section key={item.id} className="account-legal-dialog-document">
            <h4>{item.title}</h4>
            <p>Versão {item.versionLabel} · vigente desde {formatDate(item.effectiveAt)}.</p>
            <div>{item.contentText || "O conteúdo deste documento ainda não foi disponibilizado para leitura."}</div>
          </section>)}
        </article>
        <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/> Li e aceito as versões dos documentos exibidos.</label>
        <div><button type="button" className="chip" disabled={accepting} onClick={() => setOpenRequirement(null)}>Agora não</button><button type="button" className="auth-btn" disabled={!confirmed || accepting} onClick={acceptRequirement}>{accepting ? "Registrando..." : "Registrar aceite"}</button></div>
      </section>
    </div> : null}
  </section>;
}
