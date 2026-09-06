import { useEffect, useState } from "react";
import { FileSignature, MailCheck, RefreshCw, ShieldAlert, ShieldCheck, X } from "lucide-react";
import {
  confirmMyLegalSignature,
  declineMyLegalSignature,
  getMyLegalSignature,
  getMyLegalSignatures,
  requestMyLegalSignatureCode
} from "../../services/legalDocuments.service";
import { getPendingLegalSignatures } from "../../hooks/useLegalSignaturesQuery";

const STATUS_LABELS = {
  pending: "Aguardando leitura",
  viewed: "Aguardando assinatura",
  signed: "Assinado",
  declined: "Recusado",
  expired: "Prazo expirado",
  cancelled: "Cancelado"
};

function formatDate(value) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Ainda não definido";
}

function pendingSignatureNotice(pending) {
  const first = pending[0];
  const targetName = first?.claimContext?.targetName;
  const targetType = first?.claimContext?.targetType;
  const targetLabel = targetName
    ? `o perfil de ${targetName}`
    : targetType === "artist"
      ? "um perfil artístico"
      : targetType === "venue"
        ? "uma casa"
        : "sua solicitação";

  if (pending.length > 1) {
    return {
      title: `Você tem ${pending.length} reivindicações aguardando assinatura`,
      detail: "A análise de elegibilidade foi aprovada. Leia e assine os termos abaixo para concluir cada reivindicação e liberar seus acessos de gestão."
    };
  }

  return {
    title: `Sua solicitação para gerenciar ${targetLabel} foi aprovada na etapa de elegibilidade.`,
    detail: "Para concluir a reivindicação e liberar seu acesso de gestão, leia e assine o termo abaixo com sua senha e o código enviado ao seu e-mail."
  };
}

export default function MyLegalSignaturesCard() {
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  const [item, setItem] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ password: "", code: "", acknowledged: false, declineReason: "", declining: false });
  const [codeSent, setCodeSent] = useState(false);

  async function load() {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      setState({ loading: false, error: "", items: await getMyLegalSignatures() });
    } catch (_error) {
      setState({ loading: false, error: "Não foi possível carregar suas assinaturas agora.", items: [] });
    }
  }

  useEffect(() => { load(); }, []);

  async function openSignature(participant) {
    setBusy(`open-${participant.id}`); setMessage("");
    try {
      setItem(await getMyLegalSignature(participant.id));
      setForm({ password: "", code: "", acknowledged: false, declineReason: "", declining: false });
      setCodeSent(false);
    } catch (error) {
      setState((current) => ({ ...current, error: error?.response?.data?.message || "Não foi possível abrir este documento." }));
    } finally { setBusy(""); }
  }

  async function sendCode() {
    if (!item || !form.acknowledged || !form.password) return;
    setBusy("code"); setMessage("");
    try {
      const result = await requestMyLegalSignatureCode(item.id, { password: form.password, acknowledged: form.acknowledged });
      setCodeSent(true);
      setMessage(`Senha confirmada. Enviamos um código para o e-mail da sua conta 77Gira. Ele expira em ${Math.max(1, Math.round((new Date(result.expiresAt) - Date.now()) / 60000))} minutos.`);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível enviar o código agora.");
    } finally { setBusy(""); }
  }

  async function sign() {
    if (!item || !codeSent || !form.acknowledged || !form.password || !/^\d{6}$/.test(form.code)) return;
    setBusy("sign"); setMessage("");
    try {
      await confirmMyLegalSignature(item.id, { password: form.password, code: form.code });
      window.dispatchEvent(new CustomEvent("77gira:professional-access-updated"));
      window.dispatchEvent(new CustomEvent("77gira:legal-signatures-updated"));
      setMessage("Assinatura registrada com sucesso.");
      await load();
      setItem((current) => current ? { ...current, status: "signed", envelopeStatus: "completed", signedAt: new Date().toISOString() } : current);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível registrar a assinatura.");
    } finally { setBusy(""); }
  }

  async function decline() {
    if (!item || form.declineReason.trim().length < 10) return;
    setBusy("decline"); setMessage("");
    try {
      await declineMyLegalSignature(item.id, form.declineReason.trim());
      window.dispatchEvent(new CustomEvent("77gira:legal-signatures-updated"));
      setMessage("Recusa registrada. A equipe responsável será avisada.");
      await load();
      setItem((current) => current ? { ...current, status: "declined", envelopeStatus: "declined" } : current);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível registrar a recusa.");
    } finally { setBusy(""); }
  }

  // Corporate data is completed in the advertiser Workspace before a frozen
  // contractual snapshot exists. Do not present that provisional envelope as
  // signable in this generic signature list.
  const signatureItems = state.items.filter((entry) => entry.envelopeStatus !== "pending_counterpart_details");
  const pending = getPendingLegalSignatures(signatureItems);
  const pendingNotice = pending.length ? pendingSignatureNotice(pending) : null;
  const activeSignatureStep = !form.acknowledged ? 1 : codeSent ? 3 : 2;
  return <section id="assinaturas-formais" className="account-settings-section account-legal-signatures-section" tabIndex="-1">
    <div className="account-settings-section-title"><FileSignature size={18} aria-hidden="true" /><div><strong>Assinaturas formais</strong><small>Documentos que exigem confirmação reforçada de identidade.</small></div></div>
    <p className="account-legal-documents-note">Quando houver assinatura pendente, confirme com sua senha atual e um código enviado ao seu e-mail. O documento, sua versão e a trilha de confirmação ficam registrados.</p>
    {state.loading ? <small className="account-legal-documents-loading">Carregando assinaturas…</small> : null}
    {state.error ? <div className="account-legal-documents-error"><span>{state.error}</span><button type="button" onClick={load}><RefreshCw size={14}/> Tentar novamente</button></div> : null}
    {!state.loading && !state.error && !signatureItems.length ? <div className="account-legal-documents-empty"><FileSignature size={17}/><span>Nenhuma assinatura formal pendente ou registrada para esta conta.</span></div> : null}
    {pendingNotice ? <div className="account-legal-signatures-required" role="status"><strong>{pendingNotice.title}</strong><span>{pendingNotice.detail}</span></div> : null}
    {signatureItems.length ? <ul className="account-legal-documents-list account-legal-signatures-list">
      {signatureItems.map((entry) => {
        const actionable = ["pending", "viewed"].includes(entry.status);
        const unavailable = ["expired", "cancelled"].includes(entry.status);
        return <li key={entry.id}><span><strong>{entry.title}</strong><small>{entry.documentTitle} · versão {entry.versionLabel}</small><small>Protocolo {entry.protocol} · prazo {formatDate(entry.expiresAt)}</small></span><div><em className={`legal-signature-status status-${entry.status}`}>{STATUS_LABELS[entry.status] || entry.status}</em><button type="button" className="chip" disabled={busy === `open-${entry.id}` || unavailable} onClick={() => openSignature(entry)}>{busy === `open-${entry.id}` ? "Abrindo…" : actionable ? "Ler e assinar" : entry.status === "signed" ? "Ver registro" : "Indisponível"}</button></div></li>;
      })}
    </ul> : null}
    {item ? <div className="account-legal-dialog-backdrop" role="presentation" onMouseDown={() => !busy && setItem(null)}>
      <section className="account-legal-dialog account-legal-signature-dialog" role="dialog" aria-modal="true" aria-labelledby="signature-document-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="account-legal-dialog-close" type="button" disabled={Boolean(busy)} onClick={() => setItem(null)} aria-label="Fechar documento"><X size={17}/></button>
        <span>ASSINATURA FORMAL 77GIRA</span><h3 id="signature-document-title">{item.title}</h3><p>Protocolo {item.protocol} · versão {item.versionLabel} · integridade registrada por hash.</p>
        <article className="account-legal-signature-content"><h4>{item.documentTitle}</h4><div>{item.contentSnapshot || "Conteúdo indisponível."}</div></article>
        {item.status === "signed" ? <div className="account-legal-signature-complete"><ShieldCheck size={18}/><span>Assinado em {formatDate(item.signedAt)}. Este registro preserva a versão exata que foi confirmada.</span></div> : item.status === "declined" ? <div className="account-legal-signature-declined"><ShieldAlert size={18}/><span>Recusa registrada. A equipe poderá entrar em contato para tratar o documento.</span></div> : <>
          <div className="account-legal-signature-security"><MailCheck size={18}/><span><strong>Confirme sua identidade em duas etapas</strong><small>Depois de declarar que leu o termo, informe a senha da sua conta 77Gira. Só então enviaremos um código ao e-mail associado à sua conta.</small></span></div>
          <ol className="account-legal-signature-steps" aria-label="Etapas para assinatura do documento">
            <li className={activeSignatureStep === 1 ? "is-active" : "is-complete"}><i>1</i><span><strong>Confirme a leitura</strong><small>Declare que leu esta versão do documento.</small></span></li>
            <li className={activeSignatureStep === 2 ? "is-active" : activeSignatureStep > 2 ? "is-complete" : ""}><i>2</i><span><strong>Confirme a senha da sua conta 77Gira</strong><small>Isso libera o envio seguro do código.</small></span></li>
            <li className={activeSignatureStep === 3 ? "is-active" : ""}><i>3</i><span><strong>Digite o código enviado por e-mail</strong><small>Depois disso, sua assinatura poderá ser registrada.</small></span></li>
          </ol>
          <section className="account-legal-signature-step">
            <div className="account-legal-signature-step-heading"><span>ETAPA 1 DE 3</span><strong>Confirme que leu o documento</strong></div>
            <label className="account-legal-signature-check"><input type="checkbox" checked={form.acknowledged} onChange={(event) => { const acknowledged = event.target.checked; setForm((current) => ({ ...current, acknowledged, password: acknowledged ? current.password : "", code: "" })); setCodeSent(false); setMessage(""); }}/>Li o documento integral e confirmo que estou assinando esta versão de forma consciente.</label>
          </section>
          {form.acknowledged ? <section className="account-legal-signature-step">
            <div className="account-legal-signature-step-heading"><span>ETAPA 2 DE 3</span><strong>Confirme sua senha do 77Gira</strong><small>Use a mesma senha que você usa para entrar no 77Gira. Ao confirmá-la, enviaremos um código para o e-mail da sua conta.</small></div>
            <label>Senha da sua conta 77Gira<input type="password" autoComplete="current-password" value={form.password} onChange={(event) => { setForm((current) => ({ ...current, password: event.target.value, code: "" })); setCodeSent(false); setMessage(""); }}/></label>
            <button type="button" className="account-legal-signature-code-trigger" disabled={busy === "code" || !form.password} onClick={sendCode}>{busy === "code" ? "Confirmando senha e enviando…" : codeSent ? "Reenviar código para o e-mail da minha conta" : "Confirmar minha senha e enviar código"}</button>
            {!form.password ? <small className="account-legal-signature-code-hint">O código ainda não foi enviado. Digite sua senha do 77Gira para liberá-lo.</small> : null}
          </section> : null}
          {codeSent ? <section className="account-legal-signature-step account-legal-signature-code-step">
            <div className="account-legal-signature-step-heading"><span>ETAPA 3 DE 3</span><strong>Digite o código que enviamos por e-mail</strong><small>Confira o e-mail da sua conta 77Gira e informe os seis dígitos recebidos.</small></div>
            <label>Código de confirmação<input inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="000000"/></label>
            <button type="button" className="account-legal-signature-submit" disabled={busy === "sign" || !form.acknowledged || !form.password || !/^\d{6}$/.test(form.code)} onClick={sign}>{busy === "sign" ? "Registrando assinatura…" : "Assinar documento"}</button>
          </section> : null}
          <button type="button" className="account-legal-signature-decline-toggle" onClick={() => setForm((current) => ({ ...current, declining: !current.declining }))}>Não concordo com este documento</button>
          {form.declining ? <div className="account-legal-signature-decline"><label>Motivo da recusa<textarea minLength="10" value={form.declineReason} onChange={(event) => setForm((current) => ({ ...current, declineReason: event.target.value }))} placeholder="Explique o motivo para que a equipe possa analisar."/></label><button type="button" className="account-legal-signature-decline-submit" disabled={busy === "decline" || form.declineReason.trim().length < 10} onClick={decline}>{busy === "decline" ? "Registrando…" : "Registrar recusa"}</button></div> : null}
        </>}
        {message ? <p className="account-legal-signature-message" role="status">{message}</p> : null}
      </section>
    </div> : null}
  </section>;
}
