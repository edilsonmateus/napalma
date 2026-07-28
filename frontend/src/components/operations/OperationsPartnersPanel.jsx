import { useMemo, useState } from "react";
import { Building2, Pencil, Plus, RefreshCw } from "lucide-react";

const EMPTY_PARTNER = {
  name: "", logoUrl: "", publicDescription: "", internalNotes: "", contactName: "", contactEmail: "", contactPhone: "",
  partnershipType: "other", counterpartAgreements: "", status: "prospect", startsAt: "", endsAt: "", isPermanent: false,
  publicVisible: false, displayOrder: 0, initiativeName: "", destinationUrl: "", activationStartsAt: "", activationEndsAt: "", canAppearAsSupporter: false
};

const STATUS_LABELS = { prospect: "Prospecto", negotiating: "Em negociação", active: "Ativo", paused: "Pausado", closed: "Encerrado" };
const TYPE_LABELS = { operation: "Operação", project: "Projeto", activation: "Ativação", institutional: "Institucional", other: "Outro" };

function toInputDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function normalizeForForm(item) {
  return { ...EMPTY_PARTNER, ...item, startsAt: toInputDate(item.startsAt), endsAt: toInputDate(item.endsAt), activationStartsAt: toInputDate(item.activationStartsAt), activationEndsAt: toInputDate(item.activationEndsAt) };
}

function expiry(item) {
  if (item.isPermanent || !item.endsAt) return "Permanente ou sem término";
  const days = Math.ceil((new Date(item.endsAt).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "Vencida";
  if (days <= 30) return `Vence em ${days} dia${days === 1 ? "" : "s"}`;
  return `Vigente até ${new Intl.DateTimeFormat("pt-BR").format(new Date(item.endsAt))}`;
}

export default function OperationsPartnersPanel({ items, loading, error, onRefresh, onSave, onUploadLogo }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PARTNER);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState(false);
  const activeCount = useMemo(() => items.filter((item) => item.status === "active").length, [items]);
  const publicCount = useMemo(() => items.filter((item) => item.status === "active" && item.publicVisible).length, [items]);
  const expiringCount = useMemo(() => items.filter((item) => !item.isPermanent && item.endsAt && new Date(item.endsAt).getTime() - Date.now() < 30 * 86_400_000).length, [items]);

  function openNew() { setEditing("new"); setForm(EMPTY_PARTNER); setFormError(""); }
  function openEdit(item) { setEditing(item.id); setForm(normalizeForForm(item)); setFormError(""); }
  function setValue(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function save(event) {
    event.preventDefault();
    setSaving(true); setFormError("");
    try {
      const payload = { ...form, displayOrder: Number(form.displayOrder || 0), endsAt: form.isPermanent ? null : (form.endsAt || null), startsAt: form.startsAt || null, activationStartsAt: form.activationStartsAt || null, activationEndsAt: form.activationEndsAt || null };
      await onSave(editing === "new" ? null : editing, payload);
      setEditing(null); setForm(EMPTY_PARTNER);
    } catch (requestError) {
      setFormError(requestError?.response?.data?.message || "Não foi possível salvar o parceiro. Revise os campos e tente novamente.");
    } finally { setSaving(false); }
  }

  async function uploadLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setFormError("");
    try {
      const uploaded = await onUploadLogo(file, form.name || file.name);
      setValue("logoUrl", uploaded.url);
    } catch (requestError) {
      setFormError(requestError?.response?.data?.message || "Não foi possível enviar o logo. Use uma imagem JPG, PNG ou WebP de até 5 MB.");
    } finally { setUploading(false); }
  }

  return <>
    <header className="operations-heading">
      <div><p>PARCEIROS ESTRATÉGICOS</p><h1>Parcerias que sustentam a cena sem conduzir a curadoria.</h1><span>Cadastre o relacionamento completo internamente. Somente nome, logo e descrição pública de parcerias ativas e vigentes podem aparecer para o público.</span></div>
      <div className="operations-heading-actions"><button type="button" className="operations-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""}/> Atualizar</button><button type="button" className="operations-approve" onClick={openNew}><Plus size={16}/> Novo parceiro</button></div>
    </header>
    <div className="operations-kpis operations-kpis-compact"><article><span>Cadastrados</span><strong>{items.length}</strong></article><article><span>Ativos</span><strong>{activeCount}</strong></article><article><span>Visíveis ao público</span><strong>{publicCount}</strong></article><article className={expiringCount ? "is-attention" : ""}><span>Vencendo ou vencidos</span><strong>{expiringCount}</strong></article></div>
    <section className="operations-panel operations-partners-list"><div className="operations-panel-title"><div><p>CATÁLOGO INTERNO</p><h2>Relacionamentos e vigência</h2></div><span className="operations-queue-note">Contato, contrapartida e notas nunca são exibidos na página pública.</span></div>
      {loading ? <div className="operations-loading"><RefreshCw className="is-spinning"/> Carregando parceiros…</div> : items.length ? <div className="operations-partner-grid">{items.map((item) => <article className="operations-partner-card" key={item.id}>
        <div className="operations-partner-logo">{item.logoUrl ? <img src={item.logoUrl} alt=""/> : <Building2 size={25}/>}</div>
        <div className="operations-partner-card-copy"><strong>{item.name}</strong><span>{TYPE_LABELS[item.partnershipType] || item.partnershipType} · {STATUS_LABELS[item.status] || item.status}</span><small className={!item.isPermanent && item.endsAt && new Date(item.endsAt) < new Date() ? "is-expired" : ""}>{expiry(item)}</small></div>
        <div className="operations-partner-tags"><span className={item.publicVisible && item.status === "active" ? "operations-status operations-status-completed" : "operations-status"}>{item.publicVisible && item.status === "active" ? "Público" : "Interno"}</span><button type="button" className="operations-open" onClick={() => openEdit(item)}><Pencil size={14}/> Editar</button></div>
      </article>)}</div> : <div className="operations-empty">Nenhum parceiro cadastrado ainda. O cadastro não cria publicidade e não altera a curadoria do app.</div>}
    </section>
    {editing ? <section className="operations-panel operations-partner-form"><div className="operations-panel-title"><div><p>{editing === "new" ? "NOVO PARCEIRO" : "EDITAR PARCEIRO"}</p><h2>{editing === "new" ? "Registrar parceria estratégica" : form.name}</h2></div><button type="button" className="operations-secondary" onClick={() => setEditing(null)}>Cancelar</button></div>
      <form onSubmit={save} className="operations-partner-form-grid">
        <label>Nome público<input required value={form.name} onChange={(event) => setValue("name", event.target.value)} placeholder="Nome da marca ou instituição"/></label>
        <label>Tipo de parceria<select value={form.partnershipType} onChange={(event) => setValue("partnershipType", event.target.value)}>{Object.entries(TYPE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>Status<select value={form.status} onChange={(event) => setValue("status", event.target.value)}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>Ordem pública<input type="number" min="0" value={form.displayOrder} onChange={(event) => setValue("displayOrder", event.target.value)}/></label>
        <label className="operations-partner-wide">Descrição pública curta<textarea value={form.publicDescription || ""} onChange={(event) => setValue("publicDescription", event.target.value)} maxLength="600" placeholder="Como este parceiro contribui para a experiência cultural."/></label>
        <label className="operations-partner-wide">Logo da marca<span className="operations-file-row"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadLogo}/>{uploading ? "Enviando logo…" : form.logoUrl ? "Logo pronto para salvar" : "JPG, PNG ou WebP até 5 MB"}</span>{form.logoUrl ? <img className="operations-logo-preview" src={form.logoUrl} alt="Prévia do logo"/> : null}</label>
        <fieldset className="operations-checkbox-group"><legend>Exibição pública</legend><label><input type="checkbox" checked={form.publicVisible} onChange={(event) => setValue("publicVisible", event.target.checked)}/> Permitir exibição pública</label><label><input type="checkbox" checked={form.canAppearAsSupporter} onChange={(event) => setValue("canAppearAsSupporter", event.target.checked)}/> Elegível para futuro “Apoiado por”</label></fieldset>
        <fieldset className="operations-date-group"><legend>Vigência da parceria</legend><label>Início<input type="date" value={form.startsAt || ""} onChange={(event) => setValue("startsAt", event.target.value)}/></label><label>Término<input type="date" disabled={form.isPermanent} value={form.endsAt || ""} onChange={(event) => setValue("endsAt", event.target.value)}/></label><label className="operations-check-inline"><input type="checkbox" checked={form.isPermanent} onChange={(event) => setValue("isPermanent", event.target.checked)}/> Parceria permanente</label></fieldset>
        <details className="operations-partner-wide operations-private-details"><summary>Informações internas e futuras ativações</summary><div className="operations-partner-form-grid"><label>Responsável interno<input value={form.contactName || ""} onChange={(event) => setValue("contactName", event.target.value)}/></label><label>E-mail de contato<input type="email" value={form.contactEmail || ""} onChange={(event) => setValue("contactEmail", event.target.value)}/></label><label>Telefone<input value={form.contactPhone || ""} onChange={(event) => setValue("contactPhone", event.target.value)}/></label><label>Nome de iniciativa<input value={form.initiativeName || ""} onChange={(event) => setValue("initiativeName", event.target.value)}/></label><label className="operations-partner-wide">URL de destino futura<input type="url" value={form.destinationUrl || ""} onChange={(event) => setValue("destinationUrl", event.target.value)} placeholder="https://"/></label><label>Início da ativação<input type="date" value={form.activationStartsAt || ""} onChange={(event) => setValue("activationStartsAt", event.target.value)}/></label><label>Fim da ativação<input type="date" value={form.activationEndsAt || ""} onChange={(event) => setValue("activationEndsAt", event.target.value)}/></label><label className="operations-partner-wide">Contrapartidas acordadas<textarea value={form.counterpartAgreements || ""} onChange={(event) => setValue("counterpartAgreements", event.target.value)}/></label><label className="operations-partner-wide">Notas internas<textarea value={form.internalNotes || ""} onChange={(event) => setValue("internalNotes", event.target.value)}/></label></div></details>
        {formError ? <p className="operations-inline-error operations-partner-wide">{formError}</p> : null}
        <div className="operations-partner-wide operations-form-actions"><button type="submit" className="operations-approve" disabled={saving || uploading}>{saving ? "Salvando…" : "Salvar parceiro"}</button></div>
      </form>
    </section> : null}
    {error ? <p className="operations-inline-error">{error}</p> : null}
  </>;
}
