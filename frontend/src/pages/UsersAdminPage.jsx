import { useEffect, useState } from "react";
import { Archive, ArrowLeft, FileClock, ScrollText, ShieldCheck, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { createCommonUser, listCommonUsers, setReservedUsernamePermission } from "../services/adminUsers.service";
import { isReservedUsername, RESERVED_USERNAME_MESSAGE } from "../utils/usernamePolicy";
import { getPrivacyRetentionPreview, getSecurityReadiness, listAuditLogs, listPrivacyRequests, updatePrivacyRequest } from "../services/privacy.service";

const EMPTY = { firstName: "", lastName: "", username: "", email: "", phone: "", password: "", canUseReservedBrandUsername: false };

export default function UsersAdminPage() {
  const [form, setForm] = useState(EMPTY);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [privacyRequests, setPrivacyRequests] = useState([]);
  const [privacyBusy, setPrivacyBusy] = useState("");
  const [privacyNotes, setPrivacyNotes] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [retentionPreview, setRetentionPreview] = useState(null);
  const [securityReadiness, setSecurityReadiness] = useState(null);
  const reserved = isReservedUsername(form.username);

  async function load(search = query) {
    try { setItems(await listCommonUsers(search)); } catch (error) { setMessage(error?.response?.data?.message || "Não foi possível carregar os usuários."); }
  }
  async function loadPrivacyRequests() {
    try { setPrivacyRequests(await listPrivacyRequests()); } catch (error) { setMessage(error?.response?.data?.message || "Não foi possível carregar as solicitações de privacidade."); }
  }
  async function loadAuditLogs() {
    try { setAuditLogs(await listAuditLogs({ limit: 30 })); } catch (error) { setMessage(error?.response?.data?.message || "Nao foi possivel carregar a trilha de auditoria."); }
  }
  async function loadRetentionPreview() {
    try { setRetentionPreview(await getPrivacyRetentionPreview()); } catch (error) { setMessage(error?.response?.data?.message || "Nao foi possivel carregar a previa de retencao."); }
  }
  async function loadSecurityReadiness() {
    try { setSecurityReadiness(await getSecurityReadiness()); } catch (error) { setMessage(error?.response?.data?.message || "Nao foi possivel carregar a prontidao de seguranca."); }
  }
  useEffect(() => { load(""); loadPrivacyRequests(); loadAuditLogs(); loadRetentionPreview(); loadSecurityReadiness(); }, []);

  async function submit(event) {
    event.preventDefault(); setMessage("");
    if (reserved && !form.canUseReservedBrandUsername) { setMessage(RESERVED_USERNAME_MESSAGE); return; }
    setBusy(true);
    try {
      await createCommonUser({ ...form, phone: form.phone.trim() || undefined });
      setForm(EMPTY); setMessage("Usuário comum criado com sucesso."); await load("");
    } catch (error) { setMessage(error?.response?.data?.message || "Não foi possível criar o usuário."); }
    finally { setBusy(false); }
  }

  async function togglePermission(user) {
    try {
      const updated = await setReservedUsernamePermission(user.id, !user.canUseReservedBrandUsername);
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) { setMessage(error?.response?.data?.message || "Não foi possível alterar a permissão."); }
  }

  async function decidePrivacyRequest(item, status) {
    setPrivacyBusy(item.id);
    setMessage("");
    try {
      await updatePrivacyRequest(item.id, { status, resolutionNote: privacyNotes[item.id]?.trim() || null });
      await loadPrivacyRequests();
      setMessage("Solicitação de privacidade atualizada.");
    } catch (error) { setMessage(error?.response?.data?.message || "Não foi possível atualizar a solicitação."); }
    finally { setPrivacyBusy(""); }
  }

  return <section className="screen users-admin-screen">
    <header className="account-settings-header"><Link to="/settings" className="account-settings-back"><ArrowLeft size={18}/> Voltar para Configurações</Link><h2>Usuários</h2><p>Crie contas comuns e controle usernames oficiais da marca.</p></header>
    <form className="clean-card users-admin-form" onSubmit={submit}>
      <div className="account-settings-section-title"><UserPlus size={18}/><div><strong>Novo usuário comum</strong><small>A função será sempre Usuário comum, sem privilégios administrativos.</small></div></div>
      <div className="account-form-pair"><input required placeholder="Nome" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}/><input required placeholder="Sobrenome" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}/></div>
      <input required minLength="3" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}/>
      {reserved ? <p className="users-reserved-warning">Este username parece oficial. Marque a autorização abaixo para prosseguir.</p> : null}
      <div className="account-form-pair"><input required type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/><input placeholder="Telefone (opcional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/></div>
      <input required minLength="8" type="password" placeholder="Senha provisória (mínimo 8 caracteres)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}/>
      <label className="users-official-check"><input type="checkbox" checked={form.canUseReservedBrandUsername} onChange={(e) => setForm({ ...form, canUseReservedBrandUsername: e.target.checked })}/><span><strong>Autorizar username oficial da marca</strong><small>Permite criar e manter nomes reservados relacionados ao 77gira.</small></span></label>
      <button className="chip active" disabled={busy}>{busy ? "Criando..." : "Criar usuário"}</button>
      {message ? <p className="meta-line" role="status">{message}</p> : null}
    </form>
    <section className="clean-card users-admin-list"><div className="users-admin-search"><input placeholder="Buscar por nome, username ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)}/><button className="chip" type="button" onClick={() => load(query)}>Buscar</button></div>{items.map((user) => <article key={user.id}><span><strong>{user.firstName} {user.lastName}</strong><small>@{user.username} · {user.email}</small></span><button className={`chip ${user.canUseReservedBrandUsername ? "official" : ""}`} type="button" onClick={() => togglePermission(user)}><ShieldCheck size={14}/>{user.canUseReservedBrandUsername ? "Oficial autorizado" : "Autorizar marca"}</button></article>)}</section>
    <section className="clean-card users-admin-list privacy-admin-requests">
      <div className="account-settings-section-title"><FileClock size={18}/><div><strong>Solicitações de privacidade</strong><small>Pedidos de acesso, exportação, correção, anonimização ou exclusão enviados pelos usuários.</small></div></div>
      {privacyRequests.length ? privacyRequests.map((item) => <article key={item.id}>
        <span><strong>{item.user.firstName} {item.user.lastName} · {item.type.replace("_", " ")}</strong><small>{item.user.email} · {new Date(item.requestedAt).toLocaleString("pt-BR")}</small>{item.dueAt ? <small className={new Date(item.dueAt) < new Date() && ["received", "in_review"].includes(item.status) ? "privacy-request-overdue" : ""}>Prazo operacional: {new Date(item.dueAt).toLocaleDateString("pt-BR")}</small> : null}{item.details ? <small>{item.details}</small> : null}{["received", "in_review"].includes(item.status) ? <textarea className="privacy-admin-note" value={privacyNotes[item.id] || ""} onChange={(event) => setPrivacyNotes({ ...privacyNotes, [item.id]: event.target.value })} placeholder="Registre a ação realizada ou o motivo da decisão" maxLength="1000"/> : null}</span>
        <div className="privacy-admin-actions"><span className={`status-badge status-${item.status}`}>{item.status.replace("_", " ")}</span>{item.status === "received" ? <button className="chip" type="button" disabled={privacyBusy === item.id} onClick={() => decidePrivacyRequest(item, "in_review")}>Em análise</button> : null}{["received", "in_review"].includes(item.status) ? <><button className="chip active" type="button" disabled={privacyBusy === item.id} onClick={() => decidePrivacyRequest(item, "completed")}>Concluir</button><button className="chip" type="button" disabled={privacyBusy === item.id} onClick={() => decidePrivacyRequest(item, "rejected")}>Recusar</button></> : null}</div>
      </article>) : <p className="meta-line">Nenhuma solicitação de privacidade registrada.</p>}
    </section>
    <section className="clean-card users-admin-list audit-log-list">
      <div className="account-settings-section-title"><ScrollText size={18}/><div><strong>Trilha de auditoria</strong><small>30 eventos sensiveis mais recentes. IPs, senhas, tokens e conteudos privados nao sao exibidos.</small></div></div>
      {auditLogs.length ? auditLogs.map((item) => <article key={item.id}>
        <span><strong>{item.action}</strong><small>{item.actor ? `${item.actor.firstName} ${item.actor.lastName} - ${item.actor.email}` : "Sistema ou acao sem usuario autenticado"}</small><small>{item.subjectType}{item.subjectId ? ` - ${item.subjectId}` : ""} - {new Date(item.createdAt).toLocaleString("pt-BR")}</small>{item.metadata && Object.keys(item.metadata).length ? <small className="audit-log-metadata">{Object.entries(item.metadata).map(([key, value]) => `${key}: ${String(value)}`).join(" - ")}</small> : null}</span>
      </article>) : <p className="meta-line">Nenhum evento sensivel registrado ainda.</p>}
    </section>
    <section className="clean-card users-admin-list privacy-retention-preview">
      <div className="account-settings-section-title"><Archive size={18}/><div><strong>Prévia de retenção</strong><small>Inventário em modo seguro: nenhum dado é removido nesta tela.</small></div></div>
      {retentionPreview ? <><p className="meta-line">Gerada em {new Date(retentionPreview.generatedAt).toLocaleString("pt-BR")}. {retentionPreview.disclaimer}</p><div className="privacy-retention-grid">{retentionPreview.candidates.map((item) => <article key={item.category}><span><strong>{item.count}</strong><small>{item.category.replaceAll("_", " ")}</small><small>Prazo proposto: {item.proposedRetentionDays} dias</small></span></article>)}</div></> : <p className="meta-line">Carregando inventário de retenção...</p>}
    </section>
    <section className="clean-card users-admin-list security-readiness-list">
      <div className="account-settings-section-title"><ShieldCheck size={18}/><div><strong>Prontidão de segurança</strong><small>Diagnóstico administrativo sem exibir segredos, chaves ou valores de configuração.</small></div></div>
      {securityReadiness ? <><p className={`meta-line ${securityReadiness.ready ? "security-ready" : "security-not-ready"}`}>{securityReadiness.ready ? "Configuração obrigatória aprovada." : "Existem controles obrigatórios pendentes."} Ambiente: {securityReadiness.environment}.</p><div className="security-readiness-grid">{securityReadiness.checks.map((item) => <article key={item.key}><span><strong>{item.label}</strong><small>{item.required ? "Obrigatório" : "Recomendado"}</small></span><span className={`status-badge ${item.ok ? "status-completed" : "status-rejected"}`}>{item.ok ? "OK" : "Revisar"}</span></article>)}</div></> : <p className="meta-line">Carregando diagnóstico...</p>}
    </section>
  </section>;
}
