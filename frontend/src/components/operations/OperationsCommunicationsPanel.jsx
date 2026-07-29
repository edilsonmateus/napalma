import { useEffect, useMemo, useRef, useState } from "react";
import { Bold, FileText, Heading2, Link2, List, LoaderCircle, Mail, Plus, RefreshCw, Save, Send, Users } from "lucide-react";
import { createOperationsCommunicationMessage, listOperationsCommunicationMessages, listOperationsCommunicationRecipients, listOperationsCommunicationTemplates, sendOperationsCommunicationMessage, updateOperationsCommunicationMessage } from "../../services/operations.service";

const RECIPIENT_LABELS = {
  venue_producer: "Casa ou produtor",
  partner_brand: "Marca ou parceiro",
  user: "Usuário"
};

const STATUS_LABELS = { draft: "Rascunho", sent: "Enviado", failed: "Falha" };

const EMPTY_COMPOSER = {
  recipientName: "",
  recipientEmail: "",
  recipientType: "venue_producer",
  recipientReferenceId: "",
  subject: "",
  contentHtml: "<p>Olá, {{nome}}.</p>",
  templateKey: "",
  includePartnerRail: false
};

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function safePreviewHtml(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

export default function OperationsCommunicationsPanel() {
  const [view, setView] = useState("history");
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composer, setComposer] = useState(EMPTY_COMPOSER);
  const [draftId, setDraftId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const editorRef = useRef(null);

  const drafts = useMemo(() => messages.filter((item) => item.status === "draft" || item.status === "failed"), [messages]);
  const history = useMemo(() => messages.filter((item) => item.status === "sent"), [messages]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [messageResponse, templateResponse] = await Promise.all([listOperationsCommunicationMessages(), listOperationsCommunicationTemplates()]);
      setMessages(messageResponse.items || []);
      setTemplates(templateResponse.items || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Não foi possível carregar as comunicações. Tentar novamente.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (composerOpen && editorRef.current && editorRef.current.innerHTML !== composer.contentHtml) editorRef.current.innerHTML = composer.contentHtml;
  }, [composer.contentHtml, composerOpen]);

  useEffect(() => {
    const query = recipientQuery.trim();
    if (query.length < 2) { setRecipientOptions([]); return undefined; }
    const timeout = setTimeout(async () => {
      try {
        const response = await listOperationsCommunicationRecipients({ type: composer.recipientType, q: query });
        setRecipientOptions(response.items || []);
      } catch { setRecipientOptions([]); }
    }, 250);
    return () => clearTimeout(timeout);
  }, [recipientQuery, composer.recipientType]);

  function openNew(template = null) {
    const next = template ? { ...EMPTY_COMPOSER, recipientType: template.audience, subject: template.subject, contentHtml: template.contentHtml, templateKey: template.id } : EMPTY_COMPOSER;
    setComposer(next);
    setDraftId(null);
    setRecipientQuery("");
    setRecipientOptions([]);
    setError("");
    setNotice("");
    setComposerOpen(true);
  }

  function openDraft(message) {
    setComposer({ recipientName: message.recipientName || "", recipientEmail: message.recipientEmail || "", recipientType: message.recipientType || "venue_producer", recipientReferenceId: message.recipientReferenceId || "", subject: message.subject || "", contentHtml: message.contentHtml || "", templateKey: message.templateKey || "", includePartnerRail: Boolean(message.includePartnerRail) });
    setDraftId(message.id);
    setRecipientQuery("");
    setRecipientOptions([]);
    setError("");
    setNotice(message.status === "failed" ? "O último envio falhou. Revise e tente novamente." : "");
    setComposerOpen(true);
  }

  function updateComposer(field, value) { setComposer((current) => ({ ...current, [field]: value })); }
  function syncEditor() { updateComposer("contentHtml", editorRef.current?.innerHTML || ""); }

  function runEditorCommand(command, value) {
    editorRef.current?.focus();
    if (command === "link") {
      const url = window.prompt("Cole um link seguro (https:// ou mailto:)");
      if (!url || !/^(https?:\/\/|mailto:)/i.test(url.trim())) return;
      document.execCommand("createLink", false, url.trim());
    } else {
      document.execCommand(command, false, value);
    }
    syncEditor();
  }

  function chooseRecipient(item) {
    setComposer((current) => ({ ...current, recipientName: item.name, recipientEmail: item.email, recipientReferenceId: item.id }));
    setRecipientQuery("");
    setRecipientOptions([]);
  }

  async function persistDraft() {
    setSaving(true);
    setError("");
    setNotice("");
    const payload = { ...composer, contentHtml: editorRef.current?.innerHTML || composer.contentHtml };
    try {
      const response = draftId ? await updateOperationsCommunicationMessage(draftId, payload) : await createOperationsCommunicationMessage(payload);
      setDraftId(response.item.id);
      setComposer((current) => ({ ...current, contentHtml: response.item.contentHtml }));
      setMessages((current) => [response.item, ...current.filter((item) => item.id !== response.item.id)]);
      setNotice(response.message || "Rascunho salvo.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Não foi possível salvar o rascunho.");
    } finally { setSaving(false); }
  }

  async function send() {
    setError("");
    setNotice("");
    setSending(true);
    try {
      let messageId = draftId;
      if (!messageId) {
        const response = await createOperationsCommunicationMessage({ ...composer, contentHtml: editorRef.current?.innerHTML || composer.contentHtml });
        messageId = response.item.id;
        setDraftId(messageId);
      } else {
        await updateOperationsCommunicationMessage(messageId, { ...composer, contentHtml: editorRef.current?.innerHTML || composer.contentHtml });
      }
      const response = await sendOperationsCommunicationMessage(messageId);
      setMessages((current) => [response.item, ...current.filter((item) => item.id !== response.item.id)]);
      setNotice(response.message || "E-mail enviado e registrado.");
      setComposerOpen(false);
      setDraftId(null);
      setView("history");
    } catch (requestError) {
      const failedItem = requestError?.response?.data?.item;
      if (failedItem) setMessages((current) => [failedItem, ...current.filter((item) => item.id !== failedItem.id)]);
      setError(requestError?.response?.data?.message || "Não foi possível enviar agora. O rascunho foi preservado.");
    } finally { setSending(false); }
  }

  const visibleMessages = view === "drafts" ? drafts : history;

  return <>
    <header className="operations-heading operations-communications-heading"><div><p>COMUNICAÇÕES</p><h1>Converse de forma direta, com registro e responsabilidade.</h1><span>Envios individuais para casas, produtores, marcas, parceiros e usuários. Não há disparos em massa nem automações nesta etapa.</span></div><div className="operations-heading-actions"><button type="button" className="operations-secondary" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""}/> Atualizar</button><button type="button" className="operations-approve" onClick={() => openNew()}><Plus size={16}/> Nova mensagem</button></div></header>
    {notice ? <p className="operations-inline-success">{notice}</p> : null}
    {error && !composerOpen ? <p className="operations-inline-error">{error}</p> : null}
    <section className="operations-panel operations-communications-summary"><div><p>HISTÓRICO INSTITUCIONAL</p><h2>{history.length} mensagens enviadas</h2><span>Cada envio registra destinatário, conteúdo, responsável, data e status.</span></div><div><p>RASCUNHOS</p><h2>{drafts.length} em preparo</h2><span>Rascunhos permanecem privados para a equipe até o envio explícito.</span></div><div><p>PARCEIROS</p><h2>Régua preparada</h2><span>Somente parceiros ativos, públicos e autorizados poderão aparecer em e-mails institucionais.</span></div></section>
    <div className="operations-communications-tabs" role="tablist" aria-label="Áreas de comunicações"><button type="button" className={view === "history" ? "is-active" : ""} onClick={() => setView("history")}><Mail size={15}/> Caixa de entrada e histórico</button><button type="button" className={view === "drafts" ? "is-active" : ""} onClick={() => setView("drafts")}><FileText size={15}/> Rascunhos <small>{drafts.length}</small></button><button type="button" className={view === "templates" ? "is-active" : ""} onClick={() => setView("templates")}><FileText size={15}/> Modelos</button></div>
    {view === "templates" ? <section className="operations-communications-templates">{templates.map((template) => <article key={template.id}><p>{RECIPIENT_LABELS[template.audience]}</p><h2>{template.title}</h2><span>{template.subject}</span><button type="button" className="operations-secondary" onClick={() => openNew(template)}>Usar modelo <Plus size={14}/></button></article>)}</section> : <section className="operations-panel operations-communications-list"><div className="operations-panel-title"><div><p>{view === "drafts" ? "EM PREPARO" : "HISTÓRICO DE ENVIOS"}</p><h2>{view === "drafts" ? "Rascunhos e tentativas pendentes" : "Mensagens individuais enviadas"}</h2></div><span className="operations-queue-note">{view === "drafts" ? "Uma falha preserva o conteúdo para nova tentativa." : "Sem métricas de abertura ou clique nesta primeira versão."}</span></div><div className="operations-table-wrap"><table className="operations-table operations-communications-table"><thead><tr><th>Destinatário</th><th>Tipo</th><th>Assunto</th><th>Status</th><th>Data</th><th>Autor</th><th aria-label="Ações"/></tr></thead><tbody>{loading ? <tr><td colSpan="7" className="operations-table-loading">Carregando comunicações…</td></tr> : visibleMessages.length ? visibleMessages.map((message) => <tr key={message.id}><td><strong>{message.recipientName || "Destinatário a definir"}</strong><small>{message.recipientEmail || "Sem e-mail"}</small></td><td>{RECIPIENT_LABELS[message.recipientType] || "A definir"}</td><td>{message.subject || "Sem assunto"}</td><td><span className={`operations-communication-status is-${message.status}`}>{STATUS_LABELS[message.status]}</span>{message.failureReason ? <small className="operations-table-failure">Revisar e tentar novamente</small> : null}</td><td>{formatDate(message.sentAt || message.updatedAt)}</td><td>{message.author?.name || "Equipe"}</td><td>{message.status !== "sent" ? <button type="button" className="operations-open" onClick={() => openDraft(message)}>Abrir</button> : <span className="operations-table-muted">Registrado</span>}</td></tr>) : <tr><td colSpan="7" className="operations-table-loading">{view === "drafts" ? "Nenhum rascunho no momento." : "Nenhum e-mail individual foi enviado ainda."}</td></tr>}</tbody></table></div></section>}
    {composerOpen ? <div className="operations-detail-backdrop operations-communications-backdrop" role="dialog" aria-modal="true" aria-label="Nova mensagem institucional"><section className="operations-detail operations-communications-composer"><header><div><button type="button" className="operations-back" onClick={() => setComposerOpen(false)}><span>←</span> Voltar para comunicações</button><p>{draftId ? "RASCUNHO EM EDIÇÃO" : "NOVA MENSAGEM"}</p><h2>Escreva, revise e envie com clareza.</h2><span>Este é um envio individual. E-mails de recuperação de senha e segurança continuam fora deste fluxo.</span></div><Mail size={22}/></header><div className="operations-composer-grid"><form onSubmit={(event) => { event.preventDefault(); send(); }}><div className="operations-composer-recipient"><label>Tipo de destinatário<select value={composer.recipientType} onChange={(event) => { updateComposer("recipientType", event.target.value); updateComposer("recipientReferenceId", ""); setRecipientQuery(""); }}><option value="venue_producer">Casa ou produtor</option><option value="partner_brand">Marca ou parceiro</option><option value="user">Usuário</option></select></label><label>Destinatário individual<input value={composer.recipientName} onChange={(event) => { updateComposer("recipientName", event.target.value); setRecipientQuery(event.target.value); }} placeholder="Busque pelo nome" autoComplete="off"/>{recipientOptions.length ? <div className="operations-recipient-options">{recipientOptions.map((item) => <button type="button" key={`${item.email}-${item.id}`} onClick={() => chooseRecipient(item)}><strong>{item.name}</strong><span>{item.detail} · {item.email}</span></button>)}</div> : null}</label><label>E-mail<input type="email" value={composer.recipientEmail} onChange={(event) => updateComposer("recipientEmail", event.target.value)} placeholder="contato@exemplo.com"/></label></div><label>Assunto<input value={composer.subject} onChange={(event) => updateComposer("subject", event.target.value)} maxLength="220" placeholder="Assunto da mensagem"/></label><div className="operations-editor-label"><span>Mensagem</span><div className="operations-editor-tools" aria-label="Formatar mensagem"><button type="button" title="Título" onClick={() => runEditorCommand("formatBlock", "h2")}><Heading2 size={16}/></button><button type="button" title="Negrito" onClick={() => runEditorCommand("bold")}><Bold size={16}/></button><button type="button" title="Lista" onClick={() => runEditorCommand("insertUnorderedList")}><List size={16}/></button><button type="button" title="Link" onClick={() => runEditorCommand("link")}><Link2 size={16}/></button></div></div><div ref={editorRef} className="operations-rich-editor" contentEditable suppressContentEditableWarning onInput={syncEditor} aria-label="Editor de texto rico"/>
        <label className="operations-partner-rail"><input type="checkbox" checked={composer.includePartnerRail} onChange={(event) => updateComposer("includePartnerRail", event.target.checked)}/><span><strong>Incluir régua de parceiros institucionais</strong><small>Opcional. Só usa parceiros estratégicos ativos, públicos e autorizados. Nunca se aplica a e-mails operacionais.</small></span></label>
        {error ? <p className="operations-inline-error">{error}</p> : null}
        <footer className="operations-composer-actions"><button type="button" className="operations-secondary" onClick={persistDraft} disabled={saving || sending}><Save size={15}/>{saving ? "Salvando…" : "Salvar como rascunho"}</button><button type="submit" className="operations-approve" disabled={saving || sending}><Send size={15}/>{sending ? "Enviando…" : "Enviar"}</button></footer></form><aside className="operations-email-preview"><p>PRÉVIA DO E-MAIL</p><div className="operations-email-canvas"><b>77Gira</b><h3>{composer.subject || "Assunto da mensagem"}</h3>{composer.recipientName ? <span>Olá, {composer.recipientName}.</span> : null}<div dangerouslySetInnerHTML={{ __html: safePreviewHtml(composer.contentHtml) }}/><footer>Equipe 77Gira<br/>77gira.com.br</footer></div><small><Users size={14}/> A prévia apresenta a assinatura institucional. A régua de parceiros só entra se a opção for marcada e houver parceiros elegíveis.</small></aside></div></section></div> : null}
  </>;
}
