import { useMemo, useState } from "react";
import { FileSignature, Mail, RefreshCw, Send, ShieldAlert, XCircle } from "lucide-react";

const STATUS = {
  pending_signature: "Aguardando assinatura",
  completed: "Concluído",
  declined: "Recusado",
  expired: "Expirado",
  cancelled: "Cancelado"
};

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Ainda não definido";
}

function NewEnvelopeForm({ versions, onCreate, onClose }) {
  const eligibleVersions = useMemo(() => versions.flatMap((document) => (document.versions || [])
    .filter((version) => ["approved", "scheduled", "active"].includes(version.status))
    .map((version) => ({ ...version, documentTitle: document.title }))), [versions]);
  const [form, setForm] = useState({
    documentVersionId: eligibleVersions[0]?.id || "",
    participantEmail: "",
    participantName: "",
    participantRole: "",
    title: "",
    expiresAt: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await onCreate({
        ...form,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined
      });
      onClose(result?.delivery === "failed"
        ? "O envelope foi criado, mas o convite não pôde ser enviado. Use “Reenviar convite” após verificar o e-mail."
        : "Convite enviado e assinatura formal criada.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Não foi possível criar o envelope. Revise os dados e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return <form className="operations-signature-form" onSubmit={submit}>
    <div className="operations-signature-form-head">
      <div>
        <span className="operations-eyebrow">ASSINATURA REFORÇADA</span>
        <h3>Emitir documento para assinatura</h3>
        <p>A versão selecionada é congelada com hash. A pessoa confirma com senha atual e código enviado ao e-mail.</p>
      </div>
      <button type="button" className="operations-secondary-button" onClick={() => onClose("")}>Cancelar</button>
    </div>
    {!eligibleVersions.length ? <div className="operations-signature-warning"><ShieldAlert size={17}/> Publique ou aprove uma versão documental antes de emitir uma assinatura.</div> : <>
      <label>Documento e versão
        <select value={form.documentVersionId} onChange={(event) => set("documentVersionId", event.target.value)}>
          {eligibleVersions.map((version) => <option key={version.id} value={version.id}>{version.documentTitle} · versão {version.versionLabel}</option>)}
        </select>
      </label>
      <div className="operations-signature-form-grid">
        <label>Nome da pessoa<input value={form.participantName} onChange={(event) => set("participantName", event.target.value)} placeholder="Nome completo"/></label>
        <label>E-mail para assinatura<input required type="email" value={form.participantEmail} onChange={(event) => set("participantEmail", event.target.value)} placeholder="nome@empresa.com"/></label>
      </div>
      <div className="operations-signature-form-grid">
        <label>Qualidade ou função<input value={form.participantRole} onChange={(event) => set("participantRole", event.target.value)} placeholder="Ex.: representante legal"/></label>
        <label>Prazo para assinatura<input type="datetime-local" value={form.expiresAt} onChange={(event) => set("expiresAt", event.target.value)}/></label>
      </div>
      <label>Título do envelope (opcional)<input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Usa o título do documento se vazio"/></label>
      {error ? <p className="operations-panel-error">{error}</p> : null}
      <button type="submit" className="operations-primary-button" disabled={saving}>{saving ? "Emitindo..." : <><Send size={16}/> Emitir e enviar convite</>}</button>
    </>}
  </form>;
}

export default function OperationsSignaturesPanel({ items = [], documents = [], loading, error, onRefresh, onCreate, onCancel, onResend }) {
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busyId, setBusyId] = useState("");
  const [cancelId, setCancelId] = useState("");
  const [reason, setReason] = useState("");

  async function resend(id) {
    setBusyId(id);
    setFeedback("");
    try {
      await onResend(id);
      setFeedback("Convite reenviado para o e-mail informado.");
      await onRefresh();
    } catch (requestError) {
      setFeedback(requestError?.response?.data?.message || "Não foi possível reenviar o convite.");
    } finally {
      setBusyId("");
    }
  }

  async function cancel() {
    if (!reason.trim() || reason.trim().length < 10) {
      setFeedback("Informe uma justificativa com pelo menos 10 caracteres para cancelar.");
      return;
    }
    setBusyId(cancelId);
    setFeedback("");
    try {
      await onCancel(cancelId, reason.trim());
      setCancelId("");
      setReason("");
      setFeedback("Envelope cancelado e registrado na auditoria.");
      await onRefresh();
    } catch (requestError) {
      setFeedback(requestError?.response?.data?.message || "Não foi possível cancelar o envelope.");
    } finally {
      setBusyId("");
    }
  }

  return <section className="operations-signatures-panel">
    <div className="operations-panel-heading">
      <div>
        <span className="operations-eyebrow">ASSINATURAS FORMAIS</span>
        <h2>Assinaturas eletrônicas reforçadas</h2>
        <p>Use apenas para documentos que exigem identificação reforçada, versão imutável e trilha de auditoria.</p>
      </div>
      <div className="operations-panel-heading-actions">
        <button className="operations-secondary-button" onClick={onRefresh} disabled={loading}><RefreshCw size={16}/> Atualizar</button>
        <button className="operations-primary-button" onClick={() => { setShowForm(true); setFeedback(""); }}><FileSignature size={16}/> Nova assinatura</button>
      </div>
    </div>
    {feedback ? <div className="operations-signature-feedback">{feedback}</div> : null}
    {showForm ? <NewEnvelopeForm versions={documents} onCreate={onCreate} onClose={(message) => { setShowForm(false); if (message) setFeedback(message); }} /> : null}
    {loading ? <p className="operations-panel-muted">Carregando assinaturas formais...</p> : error ? <div className="operations-panel-error"><span>{error}</span><button type="button" className="operations-text-button" onClick={onRefresh}>Tentar novamente</button></div> : items.length ? <div className="operations-signature-list">{items.map((item) => {
      const participant = item.participants?.[0];
      const canManage = item.status === "pending_signature";
      return <article className="operations-signature-item" key={item.id}>
        <div className="operations-signature-item-main">
          <span className={`operations-signature-status status-${item.status}`}>{STATUS[item.status] || item.status}</span>
          <h3>{item.title}</h3>
          <p><strong>{item.protocol}</strong> · {item.documentTitleSnapshot} · versão {item.versionLabelSnapshot}</p>
          <p>{participant?.nameSnapshot || "Pessoa responsável"} · {participant?.emailSnapshot} {participant?.roleLabel ? `· ${participant.roleLabel}` : ""}</p>
          <small>Emitido em {formatDate(item.createdAt)} · prazo {formatDate(item.expiresAt)} · convite {participant?.invitationSentAt ? `enviado em ${formatDate(participant.invitationSentAt)}` : "pendente de envio"}</small>
        </div>
        <div className="operations-signature-item-actions">{canManage ? <>
          <button className="operations-secondary-button" onClick={() => resend(item.id)} disabled={busyId === item.id}><Mail size={15}/> {busyId === item.id ? "Enviando..." : "Reenviar convite"}</button>
          <button className="operations-danger-subtle" onClick={() => { setCancelId(item.id); setReason(""); }}><XCircle size={15}/> Cancelar</button>
        </> : null}</div>
      </article>;
    })}</div> : <div className="operations-empty-state"><FileSignature size={22}/><p>Nenhuma assinatura formal emitida. Os aceites comuns continuam registrados separadamente.</p></div>}
    {cancelId ? <div className="operations-signature-cancel" role="dialog" aria-modal="true"><div>
      <span className="operations-eyebrow">AÇÃO REVERSÍVEL</span>
      <h3>Cancelar envelope de assinatura</h3>
      <p>O documento congelado e o histórico permanecem auditáveis; a pessoa não poderá mais assinar este envelope.</p>
      <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Justificativa obrigatória para auditoria"/>
      <div className="operations-signature-cancel-actions"><button className="operations-secondary-button" onClick={() => setCancelId("")}>Voltar</button><button className="operations-danger-button" onClick={cancel} disabled={busyId === cancelId}>{busyId === cancelId ? "Cancelando..." : "Confirmar cancelamento"}</button></div>
    </div></div> : null}
  </section>;
}
