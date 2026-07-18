import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, Building2, ChevronRight, ClipboardList, FileClock, Gavel, Landmark, LoaderCircle, MapPinned, Megaphone, RefreshCw, Search, ShieldCheck, SlidersHorizontal, UserCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { actOnOperationsPrivacyRequest, getOperationsPrivacyRequestDetail, listAuditLogs, listOperationsPrivacyRequests } from "../services/privacy.service";
import { decideClaim, getAdminRegions, getAdCampaigns, getOperationsClaimDetail, getOperationsClaims, getOperationsVenues } from "../services/events.service";
import { getAdReviewQueue } from "../services/adReviews.service";
import { getAdvertiserAccounts } from "../services/advertiserAccounts.service";
import { confirmOperationsWebAuthn, enrollOperationsWebAuthn, getOperationsModerationQueue, getOperationsNotificationsOverview, getOperationsSettingsOverview, getOperationsWebAuthnStatus, listOperationsAccessGrants, setOperationsAccessGrant } from "../services/operations.service";
import { useAuthStore } from "../store/authStore";
import { isAdminRole } from "../utils/roles";

const TYPE_LABELS = {
  access: "Acesso a dados",
  data_export: "Exportação de dados",
  deletion: "Exclusão de conta",
  anonymization: "Anonimização",
  correction: "Correção de dados",
  opposition: "Revogação de consentimento"
};

const STATUS_LABELS = {
  received: "Nova",
  in_review: "Em análise",
  completed: "Concluída",
  rejected: "Recusada",
  cancelled: "Cancelada"
};

const modules = [
  { key: "overview", label: "Visão geral", icon: ClipboardList },
  { key: "privacy", label: "Privacidade e solicitações", icon: ShieldCheck },
  { key: "claims", label: "Reivindicações de artistas", icon: UserCheck },
  { key: "venues", label: "Casas e programação", icon: Building2, pending: true },
  { key: "territories", label: "Praças e regiões", icon: MapPinned, adminOnly: true },
  { key: "ads", label: "77Gira Ads", icon: Megaphone, adminOnly: true },
  { key: "moderation", label: "Qualidade e moderação", icon: Gavel, pending: true },
  { key: "notifications", label: "Notificações", icon: Bell, pending: true },
  { key: "audit", label: "Auditoria", icon: FileClock, pending: true },
  { key: "settings", label: "Configurações internas", icon: SlidersHorizontal, pending: true }
];

const SCOPE_BY_SECTION = {
  privacy: "privacy",
  claims: "claims",
  venues: "catalog",
  moderation: "catalog",
  notifications: "notifications",
  audit: "audit",
  settings: "settings"
};

function formatDate(value, includeTime = false) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(new Date(value));
}

function dueLabel(value) {
  if (!value) return "Sem SLA";
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `Vencida há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "Vence hoje";
  return `${days} dia${days === 1 ? "" : "s"}`;
}

function RiskTag({ risk }) {
  return <span className={`operations-risk operations-risk-${risk}`}>{risk === "high" ? "Alto" : risk === "medium" ? "Médio" : "Baixo"}</span>;
}

function StatusTag({ status }) {
  return <span className={`operations-status operations-status-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

function ClaimStatusTag({ status }) {
  const labels = { pending: "Pendente", approved: "Aprovada", rejected: "Recusada" };
  return <span className={`operations-status operations-status-claim-${status}`}>{labels[status] || status}</span>;
}

function ClaimsOperationsPanel({ items, loading, error, onRefresh, onOpen }) {
  return <>
    <header className="operations-heading"><div><p>REIVINDICAÇÕES DE ARTISTAS</p><h1>Legitimidade antes de liberar acesso.</h1><span>Verifique vínculo, evidências e o destino da solicitação. A fila não exibe documentos ou contatos sem abertura explícita do caso.</span></div><button type="button" className="operations-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""}/> Atualizar</button></header>
    <section className="operations-panel operations-queue-panel"><div className="operations-panel-title"><div><p>FILA DE REIVINDICAÇÕES</p><h2>{items.filter((item) => item.status === "pending").length} pendente{items.filter((item) => item.status === "pending").length === 1 ? "" : "s"}</h2></div><span className="operations-queue-note">Aprovação cria acessos reais; recusa exige fundamento.</span></div><div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>Protocolo</th><th>Perfil</th><th>Solicitante</th><th>Solicitação</th><th>Status</th><th>Risco</th><th>Recebida</th><th aria-label="Ações"/></tr></thead><tbody>{loading ? <tr><td colSpan="8" className="operations-table-loading">Carregando reivindicações…</td></tr> : items.length ? items.map((item) => <tr key={item.id}><td><button type="button" className="operations-protocol" onClick={() => onOpen(item.id)}>{item.protocol}</button></td><td>{item.target}</td><td>{item.requesterName}</td><td>{item.requestType === "team_access" ? "Acesso à equipe" : item.requestType === "artist_inclusion" ? "Inclusão de artista" : item.requestType === "venue_update" ? "Atualização de casa" : "Propriedade"}</td><td><ClaimStatusTag status={item.status}/></td><td><RiskTag risk={item.risk}/></td><td>{formatDate(item.createdAt)}</td><td><button type="button" className="operations-open" onClick={() => onOpen(item.id)}>Abrir</button></td></tr>) : <tr><td colSpan="8" className="operations-table-loading">Não há reivindicações nesta leitura.</td></tr>}</tbody></table></div></section>
    {error ? <p className="operations-inline-error">{error}</p> : null}
  </>;
}

function OperationsVenuesPanel({ items, loading, error, onRefresh }) {
  const attentionCount = items.filter((item) => item.attention).length;
  const menuLabel = (status) => ({ published: "Publicado", draft: "Rascunho", not_configured: "Não configurado" }[status] || status);
  return <>
    <header className="operations-heading"><div><p>CASAS E PROGRAMAÇÃO</p><h1>Catálogo acompanhado sem transformar operação em ruído.</h1><span>Esta leitura aponta agenda futura, cardápio e presença visual. Contatos e dados privados permanecem nos ambientes apropriados.</span></div><button type="button" className="operations-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""}/> Atualizar</button></header>
    <div className="operations-kpis operations-kpis-compact"><article><span>Casas lidas</span><strong>{items.length}</strong></article><article><span>Com próximo evento</span><strong>{items.filter((item) => item.nextEvent).length}</strong></article><article className="is-attention"><span>Pedem atenção</span><strong>{attentionCount}</strong></article><article><span>Cardápios publicados</span><strong>{items.filter((item) => item.menuStatus === "published").length}</strong></article></div>
    <section className="operations-panel operations-queue-panel"><div className="operations-panel-title"><div><p>LEITURA OPERACIONAL</p><h2>Casas e agenda</h2></div><span className="operations-queue-note">Use a gestão de casas para editar informações. Esta tela é somente de triagem.</span></div><div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>Casa</th><th>Local</th><th>Próximo evento</th><th>Cardápio</th><th>Acessos</th><th>Atualizada</th><th>Sinal</th></tr></thead><tbody>{loading ? <tr><td colSpan="7" className="operations-table-loading">Carregando casas…</td></tr> : items.length ? items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.location || item.region}</td><td>{item.nextEvent ? <><strong>{item.nextEvent.title}</strong><br/><small>{formatDate(item.nextEvent.startDate, true)}</small></> : <span className="operations-queue-note">Sem agenda futura</span>}</td><td>{menuLabel(item.menuStatus)}</td><td>{item.accessCount}</td><td>{formatDate(item.updatedAt)}</td><td>{item.attention ? <RiskTag risk="medium"/> : <span className="operations-status operations-status-completed">Completa</span>}</td></tr>) : <tr><td colSpan="7" className="operations-table-loading">Nenhuma casa foi encontrada nesta leitura.</td></tr>}</tbody></table></div></section>
    {error ? <p className="operations-inline-error">{error}</p> : null}
  </>;
}

function OperationsAdsPanel({ data, loading, error, onRefresh }) {
  const { campaigns = [], accounts = [], reviews = { campaigns: [], creatives: [] } } = data;
  const pendingReviews = (reviews.campaigns?.length || 0) + (reviews.creatives?.length || 0);
  const activeCampaigns = campaigns.filter((item) => item.status === "active").length;
  const pendingAccounts = accounts.filter((item) => item.status === "pending").length;
  return <>
    <header className="operations-heading"><div><p>77GIRA ADS</p><h1>Controle executivo, conectado à operação comercial.</h1><span>Use este painel para entender a fila e chegar no ambiente correto. Aprovação de criativos, inventário e campanhas continuam concentrados na Gestão de Publicidade.</span></div><button type="button" className="operations-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""}/> Atualizar</button></header>
    <div className="operations-kpis operations-kpis-compact"><article><span>Campanhas ativas</span><strong>{activeCampaigns}</strong></article><article className="is-attention"><span>Itens em revisão</span><strong>{pendingReviews}</strong></article><article><span>Contas pendentes</span><strong>{pendingAccounts}</strong></article><article><span>Contas aprovadas</span><strong>{accounts.filter((item) => item.status === "approved").length}</strong></article></div>
    <div className="operations-overview-grid"><section className="operations-panel"><div className="operations-panel-title"><div><p>FILA COMERCIAL</p><h2>O que exige decisão</h2></div><Link className="operations-secondary" to="/settings/ads">Abrir Gestão de Publicidade <ChevronRight size={15}/></Link></div><div className="operations-priority-list">{pendingReviews ? <button type="button" onClick={() => window.location.assign("/settings/ads")}><RiskTag risk="medium"/><span><strong>{pendingReviews} item(ns) aguardando revisão</strong><small>Campanhas e criativos seguem a política de aprovação antes da veiculação.</small></span><ChevronRight size={17}/></button> : <div className="operations-empty">Nenhum criativo ou campanha aguarda revisão.</div>}{pendingAccounts ? <button type="button" onClick={() => window.location.assign("/settings/ads")}><RiskTag risk="medium"/><span><strong>{pendingAccounts} conta(s) anunciante pendente(s)</strong><small>Valide acesso comercial antes de liberar a criação de campanhas.</small></span><ChevronRight size={17}/></button> : null}</div></section><section className="operations-panel operations-health"><p>SAÚDE DE ENTREGA</p><h2>Leitura rápida</h2><dl><div><dt>Campanhas cadastradas</dt><dd>{campaigns.length}</dd></div><div><dt>Ativas</dt><dd>{activeCampaigns}</dd></div><div><dt>Revisão pendente</dt><dd>{pendingReviews}</dd></div></dl><small>A Central não duplica ações manuais de Ads: ela reduz o caminho até a decisão correta.</small></section></div>
  </>;
}

function OperationsTerritoriesPanel({ items, loading, error, onRefresh }) {
  const active = items.filter((item) => item.isActive).length;
  const coverage = items.filter((item) => item.venuesCount > 0).length;
  return <>
    <header className="operations-heading"><div><p>PRAÇAS E REGIÕES</p><h1>Crescimento territorial com leitura antes de expansão.</h1><span>As praças representam as cidades; as regiões organizam a descoberta local e ajudam a identificar cobertura, programação e impacto público.</span></div><button type="button" className="operations-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""}/> Atualizar</button></header>
    <div className="operations-kpis operations-kpis-compact"><article><span>Regiões ativas</span><strong>{active}</strong></article><article><span>Com casas</span><strong>{coverage}</strong></article><article className="is-attention"><span>Sem cobertura</span><strong>{items.filter((item) => item.isActive && !item.venuesCount).length}</strong></article><article><span>Casas mapeadas</span><strong>{items.reduce((sum, item) => sum + item.venuesCount, 0)}</strong></article></div>
    <section className="operations-panel operations-queue-panel"><div className="operations-panel-title"><div><p>COBERTURA ATUAL</p><h2>Regiões cadastradas</h2></div><span className="operations-queue-note">Criação e edição de regiões continuam na gestão administrativa já existente.</span></div><div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>Região</th><th>Praça</th><th>Estado</th><th>Casas</th><th>Origem</th><th>Status</th><th>Atualizada</th></tr></thead><tbody>{loading ? <tr><td colSpan="7" className="operations-table-loading">Carregando regiões…</td></tr> : items.length ? items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.city}</td><td>{item.state}</td><td>{item.venuesCount}</td><td>{item.source === "official" ? "Oficial" : item.source === "legacy" ? "Catálogo existente" : "Base inicial"}</td><td>{item.isActive ? <span className="operations-status operations-status-completed">Ativa</span> : <span className="operations-status operations-status-cancelled">Inativa</span>}</td><td>{item.updatedAt && new Date(item.updatedAt).getTime() > 1 ? formatDate(item.updatedAt) : "—"}</td></tr>) : <tr><td colSpan="7" className="operations-table-loading">Nenhuma região foi encontrada.</td></tr>}</tbody></table></div></section>
    {error ? <p className="operations-inline-error">{error}</p> : null}
  </>;
}

function OperationsAuditPanel({ items, loading, error, onRefresh }) {
  const actionLabel = (action) => String(action || "").replaceAll("_", " ").replaceAll(".", " · ");
  const actorLabel = (actor) => actor?.firstName ? [actor.firstName, actor.lastName].filter(Boolean).join(" ") : actor?.username ? `@${actor.username}` : "Sistema";
  return <>
    <header className="operations-heading"><div><p>AUDITORIA</p><h1>Rastreabilidade sem transformar a trilha em exposição.</h1><span>Esta leitura mostra quem realizou cada ação e quando. Metadados, conteúdo sensível e narrativas não aparecem nesta tela de acompanhamento.</span></div><button type="button" className="operations-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""}/> Atualizar</button></header>
    <div className="operations-kpis operations-kpis-compact"><article><span>Eventos carregados</span><strong>{items.length}</strong></article><article><span>Ações de privacidade</span><strong>{items.filter((item) => String(item.action).startsWith("privacy.")).length}</strong></article><article><span>Reivindicações</span><strong>{items.filter((item) => String(item.action).startsWith("claim.")).length}</strong></article><article><span>Mais recente</span><strong>{items[0] ? formatDate(items[0].createdAt).slice(0, 5) : "—"}</strong></article></div>
    <section className="operations-panel operations-queue-panel"><div className="operations-panel-title"><div><p>TRILHA OPERACIONAL</p><h2>Atividade recente</h2></div><span className="operations-queue-note">A auditoria é somente leitura. Alterações exigem o fluxo do respectivo módulo.</span></div><div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>Quando</th><th>Responsável</th><th>Ação</th><th>Tipo</th><th>Referência</th></tr></thead><tbody>{loading ? <tr><td colSpan="5" className="operations-table-loading">Carregando trilha…</td></tr> : items.length ? items.map((item) => <tr key={item.id}><td>{formatDate(item.createdAt, true)}</td><td>{actorLabel(item.actor)}</td><td><strong>{actionLabel(item.action)}</strong></td><td>{item.subjectType || "—"}</td><td>{item.subjectId ? item.subjectId.slice(0, 8) : "—"}</td></tr>) : <tr><td colSpan="5" className="operations-table-loading">Ainda não há eventos nesta leitura.</td></tr>}</tbody></table></div></section>
    {error ? <p className="operations-inline-error">{error}</p> : null}
  </>;
}

function OperationsNotificationsPanel({ data, loading, error, onRefresh }) {
  const summary = data || { activeSubscriptions: 0, activeSessions: 0, deliveriesLast24h: 0, inactiveSubscriptions: 0 };
  return <>
    <header className="operations-heading"><div><p>NOTIFICAÇÕES</p><h1>Entrega observada, sem transformar a Central em disparador manual.</h1><span>Aqui você acompanha a saúde das notificações e sessões do Tô na Pista. Comunicação ao público continua dependente das regras de produto e da permissão de cada pessoa.</span></div><button type="button" className="operations-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""}/> Atualizar</button></header>
    <div className="operations-kpis"><article><span>Inscrições ativas</span><strong>{summary.activeSubscriptions}</strong><small>Dispositivos com push ativo</small></article><article><span>Sessões Tô na Pista</span><strong>{summary.activeSessions}</strong><small>Ativas neste momento</small></article><article><span>Entregas em 24h</span><strong>{summary.deliveriesLast24h}</strong><small>Sugestões registradas</small></article><article className={summary.inactiveSubscriptions ? "is-attention" : ""}><span>Inscrições inativas</span><strong>{summary.inactiveSubscriptions}</strong><small>Podem indicar troca de dispositivo</small></article></div>
    <section className="operations-panel operations-health"><p>POLÍTICA DE ENTREGA</p><h2>Proteções atuais</h2><dl><div><dt>Opt-in</dt><dd>Obrigatório</dd></div><div><dt>Localização-base</dt><dd>Exigida no Tô na Pista</dd></div><div><dt>Limite de sugestões</dt><dd>Controlado por sessão</dd></div></dl><small>Não há disparo comercial manual nesta Central. Antes de ampliar notificações, o produto precisa definir propósito, consentimento e regra de frequência.</small></section>
    {error ? <p className="operations-inline-error">{error}</p> : null}
  </>;
}

function OperationsModerationPanel({ items, loading, error, onRefresh }) {
  const venueIssues = items.filter((item) => item.entityType === "venue").length;
  const eventIssues = items.filter((item) => item.entityType === "event").length;
  return <>
    <header className="operations-heading"><div><p>QUALIDADE E MODERAÇÃO</p><h1>Presença pública consistente antes de qualquer ação punitiva.</h1><span>Esta é uma fila de qualidade de catálogo: aponta informações incompletas que podem prejudicar a descoberta. Ela não bloqueia contas, nem toma decisões automatizadas contra pessoas.</span></div><button type="button" className="operations-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""}/> Atualizar</button></header>
    <div className="operations-kpis operations-kpis-compact"><article><span>Sinais encontrados</span><strong>{items.length}</strong></article><article><span>Casas</span><strong>{venueIssues}</strong></article><article><span>Eventos</span><strong>{eventIssues}</strong></article><article className="is-attention"><span>Prioridade média</span><strong>{items.filter((item) => item.risk === "medium").length}</strong></article></div>
    <section className="operations-panel operations-queue-panel"><div className="operations-panel-title"><div><p>FILA DE QUALIDADE</p><h2>Cadastro público incompleto</h2></div><span className="operations-queue-note">Corrija pelo ambiente de gestão responsável. Nenhuma sanção é aplicada a partir desta tela.</span></div><div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>Tipo</th><th>Registro</th><th>Contexto</th><th>Sinal</th><th>Prioridade</th><th>Data</th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="operations-table-loading">Verificando catálogo…</td></tr> : items.length ? items.map((item) => <tr key={item.id}><td>{item.entityType === "venue" ? "Casa" : "Evento"}</td><td><strong>{item.entity}</strong></td><td>{item.context}</td><td>{item.issue}</td><td><RiskTag risk={item.risk}/></td><td>{item.startsAt ? formatDate(item.startsAt, true) : "—"}</td></tr>) : <tr><td colSpan="6" className="operations-table-loading">Nenhum sinal de qualidade nesta leitura.</td></tr>}</tbody></table></div></section>
    {error ? <p className="operations-inline-error">{error}</p> : null}
  </>;
}

function OperationsSettingsPanel({ data, loading, error, onRefresh, isAdmin, grants, grantsLoading, grantsError, onRefreshGrants, onSetGrant }) {
  const summary = data || { environment: "development", ready: false, checks: [], auditEvents: 0, openPrivacyRequests: 0 };
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState("privacy");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const scopes = { privacy: "Privacidade e solicitações", claims: "Reivindicações", catalog: "Casas e qualidade", notifications: "Notificações", audit: "Auditoria", settings: "Configurações internas" };

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await onSetGrant({ email, scope, enabled: true });
      setEmail("");
    } catch (requestError) {
      setFormError(requestError?.response?.data?.message || "Não foi possível conceder o acesso interno.");
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(grant) {
    setFormError("");
    try {
      await onSetGrant({ email: grant.user.email, scope: grant.scope, enabled: false });
    } catch (requestError) {
      setFormError(requestError?.response?.data?.message || "Não foi possível revogar o acesso interno.");
    }
  }

  return <>
    <header className="operations-heading"><div><p>CONFIGURAÇÕES INTERNAS</p><h1>Postura de segurança, sem expor segredos.</h1><span>Esta leitura confirma se os controles fundamentais estão presentes. Credenciais, URLs completas e valores de configuração nunca são exibidos aqui.</span></div><button type="button" className="operations-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""}/> Atualizar</button></header>
    <div className="operations-kpis operations-kpis-compact"><article><span>Ambiente</span><strong>{summary.environment === "production" ? "Produção" : "Desenvolvimento"}</strong></article><article className={summary.ready ? "" : "is-attention"}><span>Controles essenciais</span><strong>{summary.ready ? "Prontos" : "Revisar"}</strong></article><article><span>Eventos em auditoria</span><strong>{summary.auditEvents}</strong></article><article><span>Solicitações abertas</span><strong>{summary.openPrivacyRequests}</strong></article></div>
    <section className="operations-panel operations-queue-panel"><div className="operations-panel-title"><div><p>LEITURA DE SEGURANÇA</p><h2>Controles configurados</h2></div><span className="operations-queue-note">Esta Central não edita ambiente de produção. Ajustes devem ser feitos pelos canais de infraestrutura autorizados.</span></div><div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>Controle</th><th>Obrigatório</th><th>Status</th><th>Orientação</th></tr></thead><tbody>{loading ? <tr><td colSpan="4" className="operations-table-loading">Lendo postura de segurança…</td></tr> : summary.checks.length ? summary.checks.map((check) => <tr key={check.key}><td><strong>{check.label}</strong></td><td>{check.required ? "Sim" : "Recomendado"}</td><td>{check.ok ? <span className="operations-status operations-status-completed">Configurado</span> : <RiskTag risk={check.required ? "high" : "medium"}/>}</td><td>{check.ok ? "Sem ação necessária nesta leitura." : "Revise pelo canal de infraestrutura antes de alterar a operação."}</td></tr>) : <tr><td colSpan="4" className="operations-table-loading">Nenhum controle foi retornado.</td></tr>}</tbody></table></div></section>
    {isAdmin ? <section className="operations-panel operations-access-panel"><div className="operations-panel-title"><div><p>ACESSOS DE OPERAÇÃO</p><h2>Delegação mínima por módulo</h2></div><span className="operations-queue-note">Administração total não é compartilhada. Cada acesso pode ser revogado sem alterar o papel principal da conta.</span></div><form className="operations-access-form" onSubmit={submit}><label>E-mail da conta interna<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="operador@77gira.com.br"/></label><label>Módulo autorizado<select value={scope} onChange={(event) => setScope(event.target.value)}>{Object.entries(scopes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button type="submit" className="operations-approve" disabled={submitting}>{submitting ? "Concedendo…" : "Conceder acesso"}</button></form>{formError ? <p className="operations-inline-error">{formError}</p> : null}<div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>Conta</th><th>Módulo</th><th>Concedido por</th><th>Em</th><th aria-label="Ação"/></tr></thead><tbody>{grantsLoading ? <tr><td colSpan="5" className="operations-table-loading">Carregando acessos delegados…</td></tr> : grants.length ? grants.map((grant) => <tr key={grant.id}><td><strong>{grant.user.name}</strong><small>{grant.user.email}</small></td><td>{scopes[grant.scope] || grant.scope}</td><td>{grant.grantedBy}</td><td>{formatDate(grant.createdAt, true)}</td><td><button type="button" className="operations-secondary" onClick={() => revoke(grant)}>Revogar</button></td></tr>) : <tr><td colSpan="5" className="operations-table-loading">Nenhum acesso delegado ativo.</td></tr>}</tbody></table></div>{grantsError ? <p className="operations-inline-error">{grantsError}</p> : null}<button type="button" className="operations-text-button" onClick={onRefreshGrants} disabled={grantsLoading}><RefreshCw size={15}/> Atualizar acessos</button></section> : null}
    {error ? <p className="operations-inline-error">{error}</p> : null}
  </>;
}

function PrivacyResolutionActions({ request, note, protocol, loading, onNoteChange, onProtocolChange, onConfirm }) {
  const eligible = ["deletion", "anonymization"].includes(request.type) && request.status === "in_review";
  if (!eligible) return <div className="operations-irreversible-lock"><strong>Exclusão, anonimização e retenção parcial</strong><span>Assuma a solicitação e conclua a revisão de vínculos antes de registrar uma decisão de retenção.</span></div>;
  const isReady = note.trim().length >= 20 && protocol.trim().toUpperCase() === request.protocol;
  return <div className="operations-resolution-confirmation"><div><p>DECISÃO COM RETENÇÃO</p><strong>Concluir solicitação sem exclusão automática</strong><span>O encerramento registra a retenção necessária e mantém a trilha de auditoria. Não apaga dados nem substitui uma operação técnica de anonimização.</span></div><textarea value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="Justificativa obrigatória para a retenção (mínimo de 20 caracteres)."/><label>Digite o protocolo para confirmar<input value={protocol} onChange={(event) => onProtocolChange(event.target.value.toUpperCase())} placeholder={request.protocol}/></label><button type="button" className="operations-warning" onClick={onConfirm} disabled={!isReady || Boolean(loading)}>{loading ? "Concluindo…" : "Concluir com retenção documentada"}</button><small>Quando houver biometria cadastrada, esta decisão pedirá confirmação local no dispositivo. Ela não é simulada.</small></div>;
}

export default function OperationsCenterPage() {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const operationScopes = user?.operationScopes || [];
  const canAccessSection = (key) => key === "overview" || isAdmin || (!modules.find((module) => module.key === key)?.adminOnly && operationScopes.includes(SCOPE_BY_SECTION[key]));
  const visibleModules = modules.filter((module) => canAccessSection(module.key));
  const [section, setSection] = useState("overview");
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [requestInfoNote, setRequestInfoNote] = useState("");
  const [retentionNote, setRetentionNote] = useState("");
  const [retentionProtocol, setRetentionProtocol] = useState("");
  const [claimItems, setClaimItems] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [claimDetailLoading, setClaimDetailLoading] = useState(false);
  const [claimDecisionNote, setClaimDecisionNote] = useState("");
  const [claimActionLoading, setClaimActionLoading] = useState("");
  const [venueItems, setVenueItems] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [venuesError, setVenuesError] = useState("");
  const [adsData, setAdsData] = useState({ campaigns: [], accounts: [], reviews: { campaigns: [], creatives: [] } });
  const [adsLoading, setAdsLoading] = useState(false);
  const [adsError, setAdsError] = useState("");
  const [territoryItems, setTerritoryItems] = useState([]);
  const [territoriesLoading, setTerritoriesLoading] = useState(false);
  const [territoriesError, setTerritoriesError] = useState("");
  const [auditItems, setAuditItems] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [notificationsData, setNotificationsData] = useState(null);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [moderationItems, setModerationItems] = useState([]);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [moderationError, setModerationError] = useState("");
  const [settingsData, setSettingsData] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [accessGrants, setAccessGrants] = useState([]);
  const [accessGrantsLoading, setAccessGrantsLoading] = useState(false);
  const [accessGrantsError, setAccessGrantsError] = useState("");
  const [webauthn, setWebauthn] = useState({ enrolled: false, credentials: 0, loading: true, error: "" });

  async function loadQueue(overrides = {}) {
    setLoading(true);
    setError("");
    try {
      const nextItems = await listOperationsPrivacyRequests({ status: overrides.status ?? status, query: overrides.query ?? query, limit: 50 });
      setItems(nextItems);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || "Não foi possível carregar as solicitações. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function loadOperationalOverview() {
    setLoading(true);
    setError("");
    try {
      const jobs = [
        ...(canAccessSection("privacy") ? [["privacy", listOperationsPrivacyRequests({ status: "all", query: "", limit: 50 })]] : []),
        ...(canAccessSection("claims") ? [["claims", getOperationsClaims({ status: "all", limit: 50 })]] : []),
        ...(isAdmin ? [["campaigns", getAdCampaigns()], ["accounts", getAdvertiserAccounts({ limit: 100 })], ["reviews", getAdReviewQueue()]] : []),
        ...(canAccessSection("moderation") ? [["moderation", getOperationsModerationQueue()]] : []),
        ...(canAccessSection("notifications") ? [["notifications", getOperationsNotificationsOverview()]] : []),
        ...(canAccessSection("audit") ? [["audit", listAuditLogs({ limit: 20 })]] : [])
      ];
      const settled = await Promise.allSettled(jobs.map(([, promise]) => promise));
      const result = Object.fromEntries(jobs.map(([key], index) => [key, settled[index]?.status === "fulfilled" ? settled[index].value : null]));
      setItems(result.privacy || []);
      setClaimItems(result.claims || []);
      setAdsData({ campaigns: result.campaigns || [], accounts: result.accounts || [], reviews: result.reviews || { campaigns: [], creatives: [] } });
      setModerationItems(result.moderation || []);
      setNotificationsData(result.notifications || null);
      setAuditItems(result.audit || []);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || "Não foi possível carregar a visão operacional. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOperationalOverview(); }, [user?.id, user?.role, operationScopes.join("|")]);
  useEffect(() => {
    getOperationsWebAuthnStatus().then((data) => setWebauthn({ ...data, loading: false, error: "" })).catch(() => setWebauthn((current) => ({ ...current, loading: false, error: "Não foi possível verificar a biometria deste dispositivo." })));
  }, [user?.id]);

  async function enrollBiometric() {
    setWebauthn((current) => ({ ...current, loading: true, error: "" }));
    try {
      await enrollOperationsWebAuthn();
      const data = await getOperationsWebAuthnStatus();
      setWebauthn({ ...data, loading: false, error: "" });
    } catch (enrollError) {
      const name = enrollError?.name === "NotAllowedError" ? "A confirmação foi cancelada no dispositivo." : null;
      setWebauthn((current) => ({ ...current, loading: false, error: name || enrollError?.response?.data?.message || "Não foi possível cadastrar a biometria." }));
    }
  }

  useEffect(() => { if (!canAccessSection(section)) setSection("overview"); }, [section, user?.id, user?.role, operationScopes.join("|")]);

  async function loadClaims() {
    setClaimsLoading(true);
    setClaimError("");
    try {
      setClaimItems(await getOperationsClaims({ status: "all", limit: 50 }));
    } catch (loadError) {
      setClaimError(loadError?.response?.data?.message || "Não foi possível carregar as reivindicações. Tente novamente.");
    } finally {
      setClaimsLoading(false);
    }
  }

  useEffect(() => { if (section === "claims" && !claimItems.length) loadClaims(); }, [section]);

  async function loadOperationsVenues() {
    setVenuesLoading(true);
    setVenuesError("");
    try {
      setVenueItems(await getOperationsVenues({ limit: 50 }));
    } catch (loadError) {
      setVenuesError(loadError?.response?.data?.message || "Não foi possível carregar as casas. Tente novamente.");
    } finally {
      setVenuesLoading(false);
    }
  }

  useEffect(() => { if (section === "venues" && !venueItems.length) loadOperationsVenues(); }, [section]);

  async function loadOperationsAds() {
    setAdsLoading(true);
    setAdsError("");
    try {
      const [campaigns, accounts, reviews] = await Promise.all([getAdCampaigns(), getAdvertiserAccounts({ limit: 100 }), getAdReviewQueue()]);
      setAdsData({ campaigns, accounts, reviews });
    } catch (loadError) {
      setAdsError(loadError?.response?.data?.message || "Não foi possível carregar a leitura de Ads. Tente novamente.");
    } finally {
      setAdsLoading(false);
    }
  }

  useEffect(() => { if (section === "ads" && !adsData.campaigns.length && !adsData.accounts.length) loadOperationsAds(); }, [section]);

  async function loadOperationsTerritories() {
    setTerritoriesLoading(true);
    setTerritoriesError("");
    try {
      setTerritoryItems(await getAdminRegions({ includeInactive: true }));
    } catch (loadError) {
      setTerritoriesError(loadError?.response?.data?.message || "Não foi possível carregar as regiões. Tente novamente.");
    } finally {
      setTerritoriesLoading(false);
    }
  }

  useEffect(() => { if (section === "territories" && !territoryItems.length) loadOperationsTerritories(); }, [section]);

  async function loadOperationsAudit() {
    setAuditLoading(true);
    setAuditError("");
    try {
      setAuditItems(await listAuditLogs({ limit: 80 }));
    } catch (loadError) {
      setAuditError(loadError?.response?.data?.message || "Não foi possível carregar a auditoria. Tente novamente.");
    } finally {
      setAuditLoading(false);
    }
  }

  useEffect(() => { if (section === "audit" && !auditItems.length) loadOperationsAudit(); }, [section]);

  async function loadOperationsNotifications() {
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      setNotificationsData(await getOperationsNotificationsOverview());
    } catch (loadError) {
      setNotificationsError(loadError?.response?.data?.message || "Não foi possível carregar a saúde de notificações. Tente novamente.");
    } finally {
      setNotificationsLoading(false);
    }
  }

  useEffect(() => { if (section === "notifications" && !notificationsData) loadOperationsNotifications(); }, [section]);

  async function loadOperationsModeration() {
    setModerationLoading(true);
    setModerationError("");
    try {
      setModerationItems(await getOperationsModerationQueue());
    } catch (loadError) {
      setModerationError(loadError?.response?.data?.message || "Não foi possível verificar a qualidade do catálogo. Tente novamente.");
    } finally {
      setModerationLoading(false);
    }
  }

  useEffect(() => { if (section === "moderation" && !moderationItems.length) loadOperationsModeration(); }, [section]);

  async function loadOperationsSettings() {
    setSettingsLoading(true);
    setSettingsError("");
    try {
      setSettingsData(await getOperationsSettingsOverview());
    } catch (loadError) {
      setSettingsError(loadError?.response?.data?.message || "Não foi possível carregar a postura de segurança. Tente novamente.");
    } finally {
      setSettingsLoading(false);
    }
  }

  useEffect(() => { if (section === "settings" && !settingsData) loadOperationsSettings(); }, [section]);

  async function loadOperationsAccessGrants() {
    if (!isAdmin) return;
    setAccessGrantsLoading(true);
    setAccessGrantsError("");
    try {
      setAccessGrants(await listOperationsAccessGrants());
    } catch (loadError) {
      setAccessGrantsError(loadError?.response?.data?.message || "Não foi possível carregar os acessos delegados.");
    } finally {
      setAccessGrantsLoading(false);
    }
  }

  async function changeOperationsAccessGrant(payload) {
    await setOperationsAccessGrant(payload);
    await loadOperationsAccessGrants();
  }

  useEffect(() => { if (section === "settings" && isAdmin && !accessGrants.length) loadOperationsAccessGrants(); }, [section, isAdmin]);

  async function openClaimDetail(id) {
    setClaimDetailLoading(true);
    setClaimError("");
    try {
      setSelectedClaim(await getOperationsClaimDetail(id));
      setClaimDecisionNote("");
    } catch (detailError) {
      setClaimError(detailError?.response?.data?.message || "Não foi possível abrir esta reivindicação.");
    } finally {
      setClaimDetailLoading(false);
    }
  }

  async function decideSelectedClaim(status) {
    if (!selectedClaim) return;
    if (status === "rejected" && claimDecisionNote.trim().length < 5) {
      setClaimError("Explique o fundamento da recusa antes de concluir a decisão.");
      return;
    }
    setClaimActionLoading(status);
    setClaimError("");
    try {
      await decideClaim(selectedClaim.id, { status, decisionNote: claimDecisionNote.trim() || undefined });
      setSelectedClaim(null);
      await loadClaims();
    } catch (decisionError) {
      setClaimError(decisionError?.response?.data?.message || "Não foi possível registrar esta decisão.");
    } finally {
      setClaimActionLoading("");
    }
  }

  const summary = useMemo(() => ({
    received: items.filter((item) => item.status === "received").length,
    inReview: items.filter((item) => item.status === "in_review").length,
    highRisk: items.filter((item) => item.risk === "high" && !["completed", "rejected", "cancelled"].includes(item.status)).length,
    closed: items.filter((item) => ["completed", "rejected", "cancelled"].includes(item.status)).length
  }), [items]);

  async function openDetail(id) {
    setDetailLoading(true);
    setError("");
    try {
      const detail = await getOperationsPrivacyRequestDetail(id);
      setSelected(detail);
      setRequestInfoNote("");
      setRetentionNote("");
      setRetentionProtocol("");
    } catch (detailError) {
      setError(detailError?.response?.data?.message || "Não foi possível abrir esta solicitação.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function runAction(action, extra = {}) {
    if (!selected) return;
    setActionLoading(action);
    setError("");
    try {
      const biometric = action === "conclude_with_retention" && webauthn.enrolled
        ? await confirmOperationsWebAuthn()
        : null;
      await actOnOperationsPrivacyRequest(selected.id, { action, ...(action === "request_information" ? { note: requestInfoNote } : {}), ...extra, ...(biometric?.proof ? { webauthnProof: biometric.proof } : {}) });
      const detail = await getOperationsPrivacyRequestDetail(selected.id);
      setSelected(detail);
      setRequestInfoNote("");
      setRetentionNote("");
      setRetentionProtocol("");
      await loadQueue();
    } catch (actionError) {
      setError(actionError?.response?.data?.message || "Não foi possível registrar esta ação. Tente novamente.");
    } finally {
      setActionLoading("");
    }
  }

  const priority = useMemo(() => [
    ...items.filter((item) => !["completed", "rejected", "cancelled"].includes(item.status)).map((item) => ({ kind: "privacy", id: item.id, risk: item.risk, label: `${item.protocol} · ${TYPE_LABELS[item.type]}`, detail: `${item.requesterName} · ${dueLabel(item.dueAt)}` })),
    ...claimItems.filter((item) => item.status === "pending").map((item) => ({ kind: "claims", id: item.id, risk: item.risk, label: `${item.protocol} · Reivindicação de artista`, detail: `${item.target} · aguardando legitimidade` })),
    ...moderationItems.filter((item) => item.risk === "medium").map((item) => ({ kind: "moderation", id: item.id, risk: item.risk, label: `Catálogo · ${item.issue}`, detail: `${item.entity} · ${item.context || "sem contexto"}` }))
  ].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.risk] - { high: 0, medium: 1, low: 2 }[b.risk])).slice(0, 6), [items, claimItems, moderationItems]);
  const adsPendingReviews = (adsData.reviews?.campaigns?.length || 0) + (adsData.reviews?.creatives?.length || 0);

  return <section className="operations-center-screen">
    <div className="operations-topbar">
      <Link to="/settings" className="operations-back"><ArrowLeft size={16}/> Configurações</Link>
      <span>Operação interna · acesso restrito</span>
      <button type="button" className="operations-secondary operations-biometric" onClick={enrollBiometric} disabled={webauthn.loading}>{webauthn.loading ? "Verificando…" : webauthn.enrolled ? "Biometria protegida" : "Cadastrar biometria"}</button>
    </div>
    <div className="operations-shell">
      <aside className="operations-sidebar" aria-label="Módulos da Central de Operações">
        <div className="operations-brand"><Landmark size={20}/><strong>Central de Operações</strong><small>77Gira</small></div>
        <nav>
          {visibleModules.map(({ key, label, icon: Icon }) => <button key={key} type="button" className={section === key ? "is-active" : ""} onClick={() => setSection(key)}><Icon size={17}/><span>{label}</span></button>)}
        </nav>
        <div className="operations-sidebar-note"><ShieldCheck size={17}/><span><strong>Trilha protegida</strong><small>Aberturas e decisões são registradas.</small></span></div>
      </aside>

      <main className="operations-main">
        {error ? <div className="operations-alert operations-alert-error">{error}<button type="button" onClick={() => loadQueue()}>Tentar novamente</button></div> : null}
        {section === "overview" ? <>
          <header className="operations-heading"><div><p>VISÃO GERAL</p><h1>Operação com contexto e rastreabilidade.</h1><span>Uma leitura consolidada para priorizar decisões, sem expor dados desnecessariamente.</span></div><button type="button" className="operations-secondary" onClick={loadOperationalOverview} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""}/> Atualizar tudo</button></header>
          <div className="operations-kpis"><article><span>Privacidade aberta</span><strong>{summary.received + summary.inReview}</strong><small>Solicitações em tratamento</small></article><article><span>Reivindicações pendentes</span><strong>{claimItems.filter((item) => item.status === "pending").length}</strong><small>Aguardando legitimidade</small></article><article className={adsPendingReviews ? "is-attention" : ""}><span>Ads em revisão</span><strong>{adsPendingReviews}</strong><small>Campanhas e criativos</small></article><article><span>Sinais de catálogo</span><strong>{moderationItems.length}</strong><small>Qualidade pública a revisar</small></article></div>
          <div className="operations-overview-grid"><section className="operations-panel"><div className="operations-panel-title"><div><p>FILA PRIORITÁRIA</p><h2>Casos que pedem atenção</h2></div><button type="button" className="operations-text-button" onClick={() => setSection("privacy")}>Abrir privacidade <ChevronRight size={15}/></button></div>{loading ? <div className="operations-loading"><LoaderCircle className="is-spinning"/> Carregando a leitura operacional…</div> : priority.length ? <div className="operations-priority-list">{priority.map((item) => <button type="button" key={`${item.kind}-${item.id}`} onClick={() => item.kind === "privacy" ? openDetail(item.id) : setSection(item.kind)}><RiskTag risk={item.risk}/><span><strong>{item.label}</strong><small>{item.detail}</small></span><ChevronRight size={17}/></button>)}</div> : <div className="operations-empty">Nenhum caso prioritário nesta leitura.</div>}</section><section className="operations-panel operations-health"><p>SAÚDE DA PLATAFORMA</p><h2>Base operacional</h2><dl><div><dt>Notificações em 24h</dt><dd>{notificationsData?.deliveriesLast24h ?? "—"}</dd></div><div><dt>Eventos em auditoria</dt><dd>{auditItems.length}</dd></div><div><dt>Contas Ads pendentes</dt><dd>{adsData.accounts.filter((item) => item.status === "pending").length}</dd></div></dl><small>Ações definitivas exigem revisão de retenções e confirmação reforçada. A Central apenas encaminha cada decisão ao fluxo adequado.</small></section></div>
        </> : section === "privacy" ? <>
          <header className="operations-heading"><div><p>PRIVACIDADE E SOLICITAÇÕES</p><h1>Decisões pessoais, tratadas com rigor.</h1><span>A lista é redigida por padrão. Dados de contato e motivo só abrem em um caso específico e deixam registro na auditoria.</span></div><button type="button" className="operations-secondary" onClick={() => loadQueue()} disabled={loading}><RefreshCw size={16} className={loading ? "is-spinning" : ""}/> Atualizar</button></header>
          <div className="operations-kpis operations-kpis-compact"><article><span>Novas</span><strong>{summary.received}</strong></article><article><span>Em análise</span><strong>{summary.inReview}</strong></article><article className="is-attention"><span>Vencendo SLA</span><strong>{summary.highRisk}</strong></article><article><span>Concluídas</span><strong>{summary.closed}</strong></article></div>
          <section className="operations-panel operations-queue-panel"><div className="operations-filter-bar"><label><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou protocolo" onKeyDown={(event) => event.key === "Enter" && loadQueue()}/></label><select value={status} onChange={(event) => { setStatus(event.target.value); loadQueue({ status: event.target.value }); }}><option value="all">Todos os status</option><option value="received">Novas</option><option value="in_review">Em análise</option><option value="completed">Concluídas</option><option value="rejected">Recusadas</option><option value="cancelled">Canceladas</option></select><button type="button" className="operations-secondary" onClick={() => loadQueue()}><Search size={15}/> Buscar</button></div>
            <div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>Protocolo</th><th>Solicitante</th><th>Tipo</th><th>Status</th><th>Prazo</th><th>Risco</th><th>Responsável</th><th aria-label="Ações"/></tr></thead><tbody>{loading ? <tr><td colSpan="8" className="operations-table-loading">Carregando solicitações…</td></tr> : items.length ? items.map((item) => <tr key={item.id}><td><button type="button" className="operations-protocol" onClick={() => openDetail(item.id)}>{item.protocol}</button></td><td>{item.requesterName}</td><td>{TYPE_LABELS[item.type]}</td><td><StatusTag status={item.status}/></td><td>{dueLabel(item.dueAt)}</td><td><RiskTag risk={item.risk}/></td><td>{item.responsible || "Sem responsável"}</td><td><button type="button" className="operations-open" onClick={() => openDetail(item.id)}>Abrir</button></td></tr>) : <tr><td colSpan="8" className="operations-table-loading">Nenhuma solicitação corresponde aos filtros.</td></tr>}</tbody></table></div></section>
        </> : section === "claims" ? <ClaimsOperationsPanel items={claimItems} loading={claimsLoading} error={claimError} onRefresh={loadClaims} onOpen={openClaimDetail}/> : section === "venues" ? <OperationsVenuesPanel items={venueItems} loading={venuesLoading} error={venuesError} onRefresh={loadOperationsVenues}/> : section === "territories" ? <OperationsTerritoriesPanel items={territoryItems} loading={territoriesLoading} error={territoriesError} onRefresh={loadOperationsTerritories}/> : section === "audit" ? <OperationsAuditPanel items={auditItems} loading={auditLoading} error={auditError} onRefresh={loadOperationsAudit}/> : section === "notifications" ? <OperationsNotificationsPanel data={notificationsData} loading={notificationsLoading} error={notificationsError} onRefresh={loadOperationsNotifications}/> : section === "moderation" ? <OperationsModerationPanel items={moderationItems} loading={moderationLoading} error={moderationError} onRefresh={loadOperationsModeration}/> : section === "settings" ? <OperationsSettingsPanel data={settingsData} loading={settingsLoading} error={settingsError} onRefresh={loadOperationsSettings} isAdmin={isAdmin} grants={accessGrants} grantsLoading={accessGrantsLoading} grantsError={accessGrantsError} onRefreshGrants={loadOperationsAccessGrants} onSetGrant={changeOperationsAccessGrant}/> : <OperationsAdsPanel data={adsData} loading={adsLoading} error={adsError} onRefresh={loadOperationsAds}/>} 
      </main>
    </div>

    {(detailLoading || selected) ? <div className="operations-detail-backdrop" role="dialog" aria-modal="true" aria-label="Detalhe da solicitação">{detailLoading ? <div className="operations-detail-loading"><LoaderCircle className="is-spinning"/> Abrindo dados restritos…</div> : <article className="operations-detail"><header><div><button type="button" className="operations-back" onClick={() => setSelected(null)}><ArrowLeft size={16}/> Voltar à fila</button><p>{selected.protocol}</p><h2>{selected.requesterName} — {TYPE_LABELS[selected.type]}</h2><span>Recebida em {formatDate(selected.requestedAt, true)} · prazo {dueLabel(selected.dueAt)}</span></div><RiskTag risk={selected.risk}/></header><div className="operations-progress" aria-label="Andamento da solicitação">{["Recebida", "Validação de identidade", "Vínculos e retenções", "Execução", "Concluída"].map((label, index) => <div key={label} className={index < 2 || selected.status === "in_review" && index === 2 ? "is-done" : ""}><i>{index + 1}</i><span>{label}</span></div>)}</div><div className="operations-detail-grid"><div><section className="operations-sensitive"><div><p>DADOS RESTRITOS</p><strong>Contato e motivo da solicitação</strong></div><small>A abertura desta área foi registrada na auditoria.</small><dl><div><dt>E-mail</dt><dd>{selected.requester.email}</dd></div><div><dt>Usuário</dt><dd>@{selected.requester.username || "não informado"}</dd></div><div className="operations-request-details"><dt>Motivo informado</dt><dd>{selected.details || "Nenhum detalhe adicional foi informado."}</dd></div></dl></section><section><p className="operations-section-label">PERFIS VINCULADOS</p><div className="operations-linked-list">{selected.linkedProfiles.map((item) => <span key={item.label}><UsersRound size={14}/>{item.label}{item.count > 1 ? ` (${item.count})` : ""}</span>)}</div></section><section><p className="operations-section-label">ITENS QUE PODEM EXIGIR RETENÇÃO</p><div className="operations-retention-list">{selected.retentionItems.map((item) => <article key={item.key}><ShieldCheck size={16}/><span><strong>{item.label}{item.count > 1 ? ` (${item.count})` : ""}</strong><small>{item.reason}</small></span></article>)}</div></section></div><aside><section className="operations-owner"><p>RESPONSABILIDADE</p><strong>{selected.responsible || "Ainda não assumida"}</strong><span>Status: <StatusTag status={selected.status}/></span><small>Uma pessoa responsável reduz decisões paralelas e mantém a trilha clara.</small></section><section className="operations-history"><p>HISTÓRICO</p>{selected.history.length ? selected.history.map((entry) => <div key={entry.id}><strong>{entry.actorName}</strong><span>{entry.action.replaceAll("_", " ").replaceAll(".", " · ")}</span><small>{formatDate(entry.createdAt, true)}</small></div>) : <small>Sem eventos anteriores.</small>}</section></aside></div><footer className="operations-detail-actions"><button type="button" className="operations-secondary" onClick={() => runAction("take_ownership")} disabled={Boolean(actionLoading)}>{actionLoading === "take_ownership" ? "Assumindo…" : "Assumir solicitação"}</button><div className="operations-request-info"><textarea value={requestInfoNote} onChange={(event) => setRequestInfoNote(event.target.value)} placeholder="Registre a informação adicional necessária para seguir."/><button type="button" className="operations-secondary" onClick={() => runAction("request_information")} disabled={Boolean(actionLoading) || requestInfoNote.trim().length < 5}>{actionLoading === "request_information" ? "Registrando…" : "Solicitar informação"}</button></div><PrivacyResolutionActions request={selected} note={retentionNote} protocol={retentionProtocol} loading={actionLoading === "conclude_with_retention"} onNoteChange={setRetentionNote} onProtocolChange={setRetentionProtocol} onConfirm={() => runAction("conclude_with_retention", { note: retentionNote.trim(), confirmationProtocol: retentionProtocol.trim() })}/></footer></article>}</div> : null}
    {(claimDetailLoading || selectedClaim) ? <div className="operations-detail-backdrop" role="dialog" aria-modal="true" aria-label="Detalhe da reivindicação">{claimDetailLoading ? <div className="operations-detail-loading"><LoaderCircle className="is-spinning"/> Abrindo evidências protegidas…</div> : <article className="operations-detail operations-claim-detail"><header><div><button type="button" className="operations-back" onClick={() => setSelectedClaim(null)}><ArrowLeft size={16}/> Voltar à fila</button><p>{selectedClaim.protocol}</p><h2>{selectedClaim.target} — reivindicação</h2><span>Recebida em {formatDate(selectedClaim.createdAt, true)} · decisão gera alterações reais de acesso.</span></div><RiskTag risk={selectedClaim.risk}/></header><div className="operations-detail-grid"><div><section className="operations-sensitive"><div><p>EVIDÊNCIAS RESTRITAS</p><strong>Solicitante e declaração apresentada</strong></div><small>A abertura desta área foi registrada na auditoria.</small><dl><div><dt>E-mail oficial</dt><dd>{selectedClaim.claim.evidence.officialEmail || selectedClaim.claim.requestedBy?.email}</dd></div><div><dt>Vínculo declarado</dt><dd>{selectedClaim.claim.evidence.relationshipRole || "Não informado"}</dd></div><div className="operations-request-details"><dt>Justificativa</dt><dd>{selectedClaim.claim.justification || "Nenhuma justificativa adicional foi apresentada."}</dd></div></dl></section><section><p className="operations-section-label">ALVOS E VÍNCULOS</p><div className="operations-linked-list"><span><UsersRound size={14}/>{selectedClaim.claim.artist ? `Artista: ${selectedClaim.claim.artist.name}` : `Casa: ${selectedClaim.claim.venue?.name || "em inclusão"}`}</span><span><ShieldCheck size={14}/>Ciência legal: {selectedClaim.claim.legalAcknowledgement ? "registrada" : "ausente"}</span></div></section><section><p className="operations-section-label">DADOS DE RESPONSABILIDADE</p><div className="operations-retention-list"><article><ShieldCheck size={16}/><span><strong>{selectedClaim.claim.evidence.responsibleName || selectedClaim.requesterName}</strong><small>Contato: {selectedClaim.claim.evidence.responsiblePhone || "não informado"} · Documento informado: {selectedClaim.claim.evidence.claimantDocument ? "sim" : "não"}</small></span></article></div></section></div><aside><section className="operations-owner"><p>DECISÃO</p><strong><ClaimStatusTag status={selectedClaim.status}/></strong><small>Aprovar pode criar vínculo de gestão, verificar um artista ou aplicar uma atualização solicitada.</small></section><section className="operations-history"><p>ORIENTAÇÃO</p><div><strong>Antes de aprovar</strong><span>Confirme legitimidade, relação com o perfil e se a alteração faz sentido para o público.</span></div><div><strong>Antes de recusar</strong><span>Registre fundamento claro para a pessoa solicitante.</span></div></section></aside></div>{selectedClaim.status === "pending" ? <footer className="operations-detail-actions"><div className="operations-request-info"><textarea value={claimDecisionNote} onChange={(event) => setClaimDecisionNote(event.target.value)} placeholder="Fundamento da decisão. Obrigatório em caso de recusa."/><button type="button" className="operations-secondary" onClick={() => decideSelectedClaim("rejected")} disabled={Boolean(claimActionLoading) || claimDecisionNote.trim().length < 5}>{claimActionLoading === "rejected" ? "Recusando…" : "Recusar com fundamento"}</button></div><button type="button" className="operations-approve" onClick={() => decideSelectedClaim("approved")} disabled={Boolean(claimActionLoading)}>{claimActionLoading === "approved" ? "Aprovando…" : "Aprovar reivindicação"}</button><div className="operations-irreversible-lock"><strong>Decisão auditável</strong><span>Esta ação usa o mesmo motor transacional das reivindicações do 77Gira e registra o responsável.</span></div></footer> : null}</article>}</div> : null}
  </section>;
}
