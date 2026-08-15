import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, FilePlus2, FileText, RefreshCw, ShieldCheck } from "lucide-react";

const CATEGORY_LABELS = {
  terms_of_use: "Termos de Uso",
  privacy_cookies: "Privacidade e Cookies",
  content_moderation: "Conteúdo, moderação e denúncias",
  claim_management: "Reivindicação e gestão de perfil",
  advertising_terms: "Termos de Publicidade",
  patacos_policy: "Patacos e Milipatacos",
  partnership_terms: "Parcerias estratégicas",
  internal_operations: "Operações internas"
};

const STATUS_LABELS = {
  draft: "Rascunho",
  in_review: "Em revisão",
  approved: "Aprovado",
  scheduled: "Agendado",
  active: "Vigente",
  replaced: "Substituído",
  archived: "Arquivado"
};

const AUDIENCE_LABELS = {
  visitor: "Visitantes",
  user: "Usuários",
  artist_manager: "Gestores de artista",
  venue_manager: "Casas",
  producer: "Produtores",
  advertiser: "Anunciantes",
  strategic_partner: "Parceiros",
  internal_operator: "Equipe interna"
};

const EMPTY_DOCUMENT = {
  key: "", title: "", category: "terms_of_use", summary: "", isPublic: true,
  versionLabel: "1.0", contentText: "", changeSummary: "Primeira versão documental.", requiresReacceptance: false,
  audiences: ["visitor", "user"]
};

const EMPTY_VERSION = {
  versionLabel: "", contentText: "", sourceDocumentUrl: "", changeType: "material", changeSummary: "", requiresReacceptance: false, audiences: []
};

function shortHash(value) {
  return value ? `${value.slice(0, 12)}…${value.slice(-6)}` : "Aguardando conteúdo";
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Ainda não definido";
}

function StatusTag({ status }) {
  return <span className={`operations-document-status status-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

function AudienceChooser({ value, onChange }) {
  function toggle(audience) {
    onChange(value.includes(audience) ? value.filter((entry) => entry !== audience) : [...value, audience]);
  }
  return <div className="operations-document-audiences">
    {Object.entries(AUDIENCE_LABELS).map(([audience, label]) => <label key={audience}><input type="checkbox" checked={value.includes(audience)} onChange={() => toggle(audience)}/>{label}</label>)}
  </div>;
}

function NewDocumentForm({ onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_DOCUMENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      await onSave(form);
      onClose();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Não foi possível criar o documento. Revise os campos e tente novamente.");
    } finally { setSaving(false); }
  }

  return <section className="operations-panel operations-document-form">
    <div className="operations-panel-title"><div><p>NOVO DOCUMENTO</p><h2>Registrar uma base documental</h2></div><button type="button" className="operations-secondary" onClick={onClose}>Cancelar</button></div>
    <form onSubmit={submit} className="operations-document-form-grid">
      <label>Identificador interno<input required maxLength="80" value={form.key} onChange={(event) => set("key", event.target.value)} placeholder="ex.: termos-publicidade"/></label>
      <label>Categoria<select value={form.category} onChange={(event) => set("category", event.target.value)}>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="operations-document-wide">Título público ou interno<input required maxLength="180" value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Nome do documento"/></label>
      <label className="operations-document-wide">Resumo de finalidade<textarea maxLength="500" value={form.summary} onChange={(event) => set("summary", event.target.value)} placeholder="Explique quando este documento será usado e para quem."/></label>
      <label>Versão inicial<input required maxLength="32" value={form.versionLabel} onChange={(event) => set("versionLabel", event.target.value)} placeholder="1.0"/></label>
      <label>Visibilidade do documento<select value={String(form.isPublic)} onChange={(event) => set("isPublic", event.target.value === "true")}><option value="true">Público quando vigente</option><option value="false">Somente interno</option></select></label>
      <label className="operations-document-wide">Conteúdo-base<textarea required minLength="20" value={form.contentText} onChange={(event) => set("contentText", event.target.value)} placeholder="Cole ou escreva o conteúdo que será versionado e protegido por hash."/></label>
      <label className="operations-document-wide">Resumo da alteração<textarea maxLength="1000" value={form.changeSummary} onChange={(event) => set("changeSummary", event.target.value)} placeholder="Descreva a origem e a finalidade desta versão."/></label>
      <fieldset className="operations-document-wide"><legend>Público relacionado</legend><AudienceChooser value={form.audiences} onChange={(value) => set("audiences", value)}/></fieldset>
      <label className="operations-check-inline operations-document-wide"><input type="checkbox" checked={form.requiresReacceptance} onChange={(event) => set("requiresReacceptance", event.target.checked)}/>Exigirá novo aceite quando esta versão entrar em vigor</label>
      {error ? <p className="operations-inline-error operations-document-wide">{error}</p> : null}
      <div className="operations-form-actions operations-document-wide"><button type="submit" className="operations-approve" disabled={saving}>{saving ? "Salvando…" : "Criar documento"}</button></div>
    </form>
  </section>;
}

function NewVersionForm({ document, onSave, onClose }) {
  const latest = document.versions?.[0];
  const [form, setForm] = useState({ ...EMPTY_VERSION, versionLabel: latest ? `${latest.versionLabel}.1` : "1.0", audiences: latest?.audiences?.map((item) => typeof item === "string" ? item : item.audience) || [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError("");
    try { await onSave(document.id, form); onClose(); } catch (requestError) { setError(requestError?.response?.data?.message || "Não foi possível salvar a nova versão."); } finally { setSaving(false); }
  }
  return <form className="operations-document-version-form" onSubmit={submit}>
    <div className="operations-document-version-heading"><strong>Nova versão de {document.title}</strong><button type="button" className="operations-text-button" onClick={onClose}>Fechar</button></div>
    <div className="operations-document-form-grid">
      <label>Rótulo da versão<input required value={form.versionLabel} onChange={(event) => set("versionLabel", event.target.value)}/></label>
      <label>Tipo de mudança<select value={form.changeType} onChange={(event) => set("changeType", event.target.value)}><option value="editorial">Editorial</option><option value="material">Material</option></select></label>
      <label className="operations-document-wide">Resumo da alteração<textarea required value={form.changeSummary} onChange={(event) => set("changeSummary", event.target.value)} placeholder="O que mudou e por quê?"/></label>
      <label className="operations-document-wide">Conteúdo da versão<textarea required minLength="20" value={form.contentText} onChange={(event) => set("contentText", event.target.value)} placeholder="Conteúdo integral que será protegido por hash."/></label>
      <label className="operations-document-wide">Link de origem (opcional)<input type="url" value={form.sourceDocumentUrl} onChange={(event) => set("sourceDocumentUrl", event.target.value)} placeholder="https://…"/></label>
      <fieldset className="operations-document-wide"><legend>Público relacionado</legend><AudienceChooser value={form.audiences} onChange={(value) => set("audiences", value)}/></fieldset>
      <label className="operations-check-inline operations-document-wide"><input type="checkbox" checked={form.requiresReacceptance} onChange={(event) => set("requiresReacceptance", event.target.checked)}/>Exigirá novo aceite quando entrar em vigor</label>
      {error ? <p className="operations-inline-error operations-document-wide">{error}</p> : null}
      <div className="operations-form-actions operations-document-wide"><button className="operations-approve" type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar versão"}</button></div>
    </div>
  </form>;
}

export default function OperationsDocumentsPanel({ items, loading, error, onRefresh, onBootstrap, onCreate, onCreateVersion, onTransition, onGetImpact }) {
  const [creating, setCreating] = useState(false);
  const [versioning, setVersioning] = useState("");
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionTarget, setActionTarget] = useState(null);
  const [actionNote, setActionNote] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");
  const [impact, setImpact] = useState(null);
  const stats = useMemo(() => ({ total: items.length, active: items.filter((item) => item.versions?.some((version) => version.status === "active")).length, review: items.filter((item) => item.versions?.some((version) => version.status === "in_review")).length, drafts: items.filter((item) => item.versions?.some((version) => version.status === "draft")).length }), [items]);

  function openTransition(documentId, version, status) {
    setActionError("");
    setActionNote("");
    setEffectiveAt("");
    setActionTarget({ documentId, version, status });
  }

  async function transition(event) {
    event.preventDefault();
    if (!actionTarget) return;
    const { documentId, version, status } = actionTarget;
    if (actionNote.trim().length < 12) {
      setActionError("Registre uma justificativa com pelo menos 12 caracteres.");
      return;
    }
    if (status === "scheduled" && !effectiveAt) {
      setActionError("Defina a data e a hora de vigência antes de agendar.");
      return;
    }
    setBusy(version.id); setActionError("");
    try {
      await onTransition(documentId, version.id, { status, note: actionNote.trim(), ...(status === "scheduled" ? { effectiveAt: new Date(effectiveAt).toISOString() } : {}) });
      setActionTarget(null);
    } catch (requestError) { setActionError(requestError?.response?.data?.message || "Não foi possível atualizar o status da versão."); } finally { setBusy(""); }
  }

  async function loadImpact(documentId, version) {
    setBusy(`impact-${version.id}`); setActionError("");
    try { setImpact(await onGetImpact(documentId, version.id)); } catch (requestError) { setActionError(requestError?.response?.data?.message || "Não foi possível calcular o impacto desta versão."); } finally { setBusy(""); }
  }

  return <>
    <header className="operations-heading"><div><p>FUNDAÇÃO DOCUMENTAL</p><h1>Documentos formais, com versão e trilha de auditoria.</h1><span>Esta etapa organiza conteúdo, versão, público e integridade. Ela ainda não bloqueia o uso comum do aplicativo nem altera consentimentos simples.</span></div><div className="operations-heading-actions"><button type="button" className="operations-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""}/> Atualizar</button><button type="button" className="operations-approve" onClick={() => setCreating(true)}><FilePlus2 size={16}/> Novo documento</button></div></header>
    <div className="operations-kpis operations-kpis-compact"><article><span>Documentos</span><strong>{stats.total}</strong></article><article><span>Versões vigentes</span><strong>{stats.active}</strong></article><article><span>Em revisão</span><strong>{stats.review}</strong></article><article className={stats.drafts ? "is-attention" : ""}><span>Rascunhos</span><strong>{stats.drafts}</strong></article></div>
    {!items.length && !loading ? <section className="operations-panel operations-documents-empty"><ShieldCheck size={24}/><div><p>CATÁLOGO INICIAL</p><h2>Preparar os documentos-base sem publicar nada.</h2><span>Crie oito registros iniciais como rascunho: Termos, Privacidade, Conteúdo, Reivindicações, Publicidade, Patacos, Parcerias e Operações internas.</span></div><button type="button" className="operations-approve" onClick={async () => { setBusy("bootstrap"); setActionError(""); try { await onBootstrap(); } catch (requestError) { setActionError(requestError?.response?.data?.message || "Não foi possível preparar o catálogo inicial."); } finally { setBusy(""); } }} disabled={busy === "bootstrap"}>{busy === "bootstrap" ? "Preparando…" : "Preparar catálogo"}</button></section> : null}
    {creating ? <NewDocumentForm onSave={onCreate} onClose={() => setCreating(false)}/> : null}
    {actionError || error ? <p className="operations-inline-error">{actionError || error}</p> : null}
    <section className="operations-panel operations-documents-list"><div className="operations-panel-title"><div><p>CATÁLOGO DOCUMENTAL</p><h2>Versões, integridade e público</h2></div><span className="operations-queue-note">O hash é calculado no servidor a partir do conteúdo de cada versão.</span></div>
      {loading ? <div className="operations-loading"><RefreshCw className="is-spinning"/> Carregando documentos…</div> : items.length ? <div className="operations-document-list">{items.map((document) => { const latest = document.versions?.[0]; return <article className="operations-document-card" key={document.id}><div className="operations-document-card-head"><div><span className="operations-document-icon"><FileText size={17}/></span><div><p>{CATEGORY_LABELS[document.category] || document.category}</p><h3>{document.title}</h3><small>{document.isPublic ? "Documento público quando vigente" : "Documento interno"}</small></div></div><button className="operations-secondary" type="button" onClick={() => setVersioning(versioning === document.id ? "" : document.id)}>Nova versão</button></div>
        {document.summary ? <p className="operations-document-summary">{document.summary}</p> : null}
        {latest ? <><div className="operations-document-version"><div><StatusTag status={latest.status}/><strong>Versão {latest.versionLabel}</strong><small>Atualizada em {formatDate(latest.updatedAt)}</small></div><div><small>Integridade</small><code>{shortHash(latest.contentSha256)}</code></div><div><small>Público</small><span>{latest.audiences?.map((item) => AUDIENCE_LABELS[typeof item === "string" ? item : item.audience]).join(" · ") || "Não definido"}</span></div><div className="operations-document-actions"><button type="button" className="operations-secondary" disabled={busy === `impact-${latest.id}`} onClick={() => loadImpact(document.id, latest)}>Ver impacto</button>{latest.status === "draft" ? <button type="button" className="operations-open" disabled={busy === latest.id} onClick={() => openTransition(document.id, latest, "in_review")}>Enviar para revisão</button> : null}{latest.status === "in_review" ? <button type="button" className="operations-open" disabled={busy === latest.id} onClick={() => openTransition(document.id, latest, "approved")}><ClipboardCheck size={14}/> Aprovar</button> : null}{latest.status === "approved" ? <button type="button" className="operations-approve" disabled={busy === latest.id} onClick={() => openTransition(document.id, latest, "scheduled")}><CheckCircle2 size={14}/> Agendar vigência</button> : null}{latest.status === "scheduled" && new Date(latest.effectiveAt) <= new Date() ? <button type="button" className="operations-approve" disabled={busy === latest.id} onClick={() => openTransition(document.id, latest, "active")}><CheckCircle2 size={14}/> Publicar versão</button> : null}</div></div>{actionTarget?.version.id === latest.id ? <form className="operations-document-transition" onSubmit={transition}><strong>{actionTarget.status === "scheduled" ? "Agendar vigência" : actionTarget.status === "active" ? "Confirmar publicação" : "Confirmar etapa"}</strong><span>Esta decisão será registrada na auditoria com sua justificativa.</span>{actionTarget.status === "scheduled" ? <label>Data e hora de vigência<input required type="datetime-local" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)}/></label> : null}<label>Justificativa<textarea required minLength="12" value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder="Explique a decisão e sua base operacional."/></label><div><button type="button" className="operations-secondary" onClick={() => setActionTarget(null)}>Cancelar</button><button type="submit" className="operations-approve" disabled={busy === latest.id}>{busy === latest.id ? "Registrando..." : "Confirmar e registrar"}</button></div></form> : null}{impact?.version?.id === latest.id ? <section className="operations-document-impact"><strong>Impacto estimado desta versão</strong><span>{impact.estimatedAccounts ?? 0} contas ou perfis potencialmente afetados.</span><div>{Object.entries(impact.audienceCounts || {}).map(([audience, count]) => <small key={audience}>{AUDIENCE_LABELS[audience] || audience}: <b>{count}</b></small>)}</div></section> : null}</> : <p className="operations-document-missing">Ainda não há versão criada.</p>}
        {versioning === document.id ? <NewVersionForm document={document} onSave={onCreateVersion} onClose={() => setVersioning("")}/> : null}
      </article>; })}</div> : <div className="operations-empty">Nenhum documento disponível.</div>}
    </section>
  </>;
}
