import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Download, FileClock, ShieldCheck, SlidersHorizontal, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import BackLink from "../components/common/BackLink";
import { createDeletionRequest, createPrivacyRequest, downloadPrivacyExport, getMyPrivacyOverview, setPrivacyConsent } from "../services/privacy.service";

const CONSENTS = [
  { purpose: "cultural_personalization", title: "Personalização cultural", detail: "Permite usar sinais gerais de uso para tornar descobertas e recomendações mais relevantes." },
  { purpose: "ads_personalization", title: "Publicidade mais relevante", detail: "Permite usar sinais agregados e não sensíveis para reduzir anúncios irrelevantes. Anunciantes nunca recebem seus dados individuais." }
];

const REQUESTS = [
  { value: "access", label: "Acessar meus dados" },
  { value: "data_export", label: "Exportar meus dados" },
  { value: "correction", label: "Corrigir informações" },
  { value: "anonymization", label: "Anonimizar dados quando aplicável" },
  { value: "opposition", label: "Questionar um tratamento" },
  { value: "deletion", label: "Solicitar exclusão da conta" }
];

function formatDate(value) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

export default function PrivacyCenterPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyPurpose, setBusyPurpose] = useState("");
  const [requestType, setRequestType] = useState("data_export");
  const [details, setDetails] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [deletionPassword, setDeletionPassword] = useState("");
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const [deletionBusy, setDeletionBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setOverview(await getMyPrivacyOverview());
    } catch (_error) {
      setMessage("Não foi possível carregar seus controles de privacidade agora.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const consentMap = useMemo(() => overview?.consents || {}, [overview]);

  async function toggleConsent(purpose, nextValue) {
    setBusyPurpose(purpose);
    setMessage("");
    try {
      await setPrivacyConsent(purpose, nextValue);
      await load();
      setMessage(nextValue ? "Sua preferência foi registrada." : "Sua permissão foi revogada. Isso não apaga dados que precisem ser mantidos por segurança ou obrigação legal.");
    } catch (_error) {
      setMessage("Não foi possível salvar sua preferência.");
    } finally {
      setBusyPurpose("");
    }
  }

  async function submitRequest(event) {
    event.preventDefault();
    setRequestBusy(true);
    setMessage("");
    try {
      await createPrivacyRequest({ type: requestType, details: details.trim() || null });
      setDetails("");
      await load();
      setMessage("Solicitação registrada. A equipe analisará o pedido e o status aparecerá nesta página.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível registrar sua solicitação.");
    } finally {
      setRequestBusy(false);
    }
  }

  async function handleExport(event) {
    event.preventDefault();
    setExportBusy(true);
    setMessage("");
    try {
      await downloadPrivacyExport(exportPassword);
      setExportPassword("");
      setMessage("Seu arquivo foi preparado para download. Guarde-o em um local seguro.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível gerar seu arquivo agora. Confirme sua senha e tente novamente.");
    } finally { setExportBusy(false); }
  }

  async function submitDeletion(event) {
    event.preventDefault();
    if (deletionConfirmation !== "EXCLUIR MINHA CONTA") {
      setMessage("Digite exatamente EXCLUIR MINHA CONTA para confirmar a solicitação.");
      return;
    }
    setDeletionBusy(true);
    setMessage("");
    try {
      const result = await createDeletionRequest(deletionPassword);
      setDeletionPassword(""); setDeletionConfirmation("");
      await load();
      setMessage(result.message || "Solicitação de exclusão registrada.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível registrar a solicitação de exclusão.");
    } finally { setDeletionBusy(false); }
  }

  return (
    <section className="settings-screen privacy-center-screen">
      <header className="account-settings-header">
        <BackLink to="/settings/account">Voltar para Conta e preferências</BackLink>
        <span className="eyebrow">PRIVACIDADE E DADOS</span>
        <h2>Seus dados, suas escolhas.</h2>
        <p>Veja o que o 77Gira trata, ajuste preferências opcionais e acompanhe solicitações relacionadas aos seus dados.</p>
      </header>

      {message ? <p className="privacy-center-message" role="status">{message}</p> : null}
      {loading ? <p className="empty">Carregando controles de privacidade...</p> : null}

      {overview ? <>
        <section className="clean-card privacy-center-summary">
          <ShieldCheck size={20}/><div><strong>Conta protegida por controles de acesso</strong><p>Política vigente: versão {overview.policyVersion}. Seus dados pessoais não são vendidos a anunciantes.</p></div><Link to="/privacy">Ler política <ChevronRight size={15}/></Link>
        </section>

        <section className="clean-card privacy-center-section">
          <div className="privacy-center-heading"><SlidersHorizontal size={18}/><div><h3>Preferências opcionais</h3><p>Você pode mudar estas escolhas a qualquer momento.</p></div></div>
          <div className="privacy-consent-list">
            {CONSENTS.map((item) => {
              const current = consentMap[item.purpose];
              const isGranted = Boolean(current?.isGranted);
              return <article key={item.purpose}><div><strong>{item.title}</strong><p>{item.detail}</p><small>{current ? `Última decisão: ${formatDate(current.createdAt)}` : "Ainda não definido"}</small></div><button type="button" className={`privacy-consent-toggle ${isGranted ? "is-granted" : ""}`} disabled={busyPurpose === item.purpose} onClick={() => toggleConsent(item.purpose, !isGranted)} aria-pressed={isGranted}>{busyPurpose === item.purpose ? "Salvando..." : isGranted ? "Permitido" : "Não permitir"}</button></article>;
            })}
          </div>
        </section>

        <section className="clean-card privacy-center-section privacy-export-section">
          <div className="privacy-center-heading"><Download size={18}/><div><h3>Baixar uma cópia dos seus dados</h3><p>Por segurança, confirme sua senha atual. O arquivo não inclui senha, tokens, IPs nem dados de outras pessoas.</p></div></div>
          <form className="privacy-request-form" onSubmit={handleExport}><label>Senha atual<input required type="password" autoComplete="current-password" value={exportPassword} onChange={(event) => setExportPassword(event.target.value)} /></label><button className="chip active" disabled={exportBusy}>{exportBusy ? "Preparando..." : "Baixar meus dados"}</button></form>
        </section>

        <section className="clean-card privacy-center-section">
          <div className="privacy-center-heading"><FileClock size={18}/><div><h3>Solicitar um direito</h3><p>Pedidos são registrados e passam por análise protegida. A exclusão pode manter dados indispensáveis à segurança, auditoria ou obrigação legal.</p></div></div>
          <form className="privacy-request-form" onSubmit={submitRequest}>
            <label>O que você precisa?<select value={requestType} onChange={(event) => setRequestType(event.target.value)}>{REQUESTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Detalhes (opcional)<textarea value={details} maxLength="1000" onChange={(event) => setDetails(event.target.value)} placeholder="Explique somente o necessário para analisarmos seu pedido."/></label>
            <button className="auth-btn" disabled={requestBusy}>{requestBusy ? "Enviando..." : "Registrar solicitação"}</button>
          </form>
        </section>

        <section className="clean-card privacy-center-section">
          <div className="privacy-center-heading"><Download size={18}/><div><h3>Histórico de solicitações</h3><p>Você acompanha aqui cada solicitação enviada pelo seu perfil.</p></div></div>
          {overview.requests.length ? <div className="privacy-request-history">{overview.requests.map((item) => <article key={item.id}><div><strong>{REQUESTS.find((type) => type.value === item.type)?.label || item.type}</strong><p>Solicitado em {formatDate(item.requestedAt)}</p>{item.dueAt ? <small>Prazo operacional: {formatDate(item.dueAt)}</small> : null}{item.resolutionNote ? <small>{item.resolutionNote}</small> : null}</div><span className={`status-badge status-${item.status}`}>{item.status.replace("_", " ")}</span></article>)}</div> : <p className="meta-line">Você ainda não enviou solicitações.</p>}
        </section>

        <section className="clean-card privacy-center-section privacy-data-categories">
          <h3>Resumo dos dados tratados</h3>{overview.categories.map((item) => <article key={item.key}><strong>{item.title}</strong><p>{item.detail}</p></article>)}
          <p className="meta-line"><Trash2 size={14}/> Para encerrar a conta, use a solicitação de exclusão; nunca removeremos seu acesso sem confirmação.</p>
        </section>

        <section className="clean-card privacy-center-section privacy-danger-zone">
          <div className="privacy-center-heading"><Trash2 size={18}/><div><h3>Solicitar exclusão da conta</h3><p>Este pedido não encerra sua conta automaticamente. A equipe avaliará dados que precisam ser mantidos por segurança, auditoria, disputa ou obrigação legal.</p></div></div>
          <form className="privacy-request-form" onSubmit={submitDeletion}>
            <label>Senha atual<input required type="password" autoComplete="current-password" value={deletionPassword} onChange={(event) => setDeletionPassword(event.target.value)} /></label>
            <label>Digite <strong>EXCLUIR MINHA CONTA</strong> para confirmar<input required value={deletionConfirmation} onChange={(event) => setDeletionConfirmation(event.target.value)} /></label>
            <button className="chip privacy-danger-button" disabled={deletionBusy}>{deletionBusy ? "Registrando..." : "Solicitar exclusão"}</button>
          </form>
        </section>
      </> : null}
    </section>
  );
}
