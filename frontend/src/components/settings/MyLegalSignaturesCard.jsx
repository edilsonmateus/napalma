import { useEffect, useState } from "react";
import { FileSignature, MailCheck, RefreshCw, ShieldAlert, ShieldCheck, X } from "lucide-react";
import {
  confirmMyLegalSignature,
  declineMyLegalSignature,
  getMyLegalSignature,
  getMyLegalSignatures,
  requestMyLegalSignatureCode
} from "../../services/legalDocuments.service";

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
      setMessage(`Senha confirmada. Código enviado. Ele expira em ${Math.max(1, Math.round((new Date(result.expiresAt) - Date.now()) / 60000))} minutos.`);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível enviar o código agora.");
    } finally { setBusy(""); }
  }

  async function sign() {
    if (!item || !codeSent || !form.acknowledged || !form.password || !/^\d{6}$/.test(form.code)) return;
    setBusy("sign"); setMessage("");
    try {
      await confirmMyLegalSignature(item.id, { password: form.password, code: form.code });
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
      setMessage("Recusa registrada. A equipe responsável será avisada.");
      await load();
      setItem((current) => current ? { ...current, status: "declined", envelopeStatus: "declined" } : current);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível registrar a recusa.");
    } finally { setBusy(""); }
  }

  const pending = state.items.filter((entry) => ["pending", "viewed"].includes(entry.status));
  return <section className="account-settings-section account-legal-signatures-section">
    <div className="account-settings-section-title"><FileSignature size={18} aria-hidden="true" /><div><strong>Assinaturas formais</strong><small>Documentos que exigem confirmação reforçada de identidade.</small></div></div>
    <p className="account-legal-documents-note">Quando houver assinatura pendente, confirme com sua senha atual e um código enviado ao seu e-mail. O documento, sua versão e a trilha de confirmação ficam registrados.</p>
    {state.loading ? <small className="account-legal-documents-loading">Carregando assinaturas…</small> : null}
    {state.error ? <div className="account-legal-documents-error"><span>{state.error}</span><button type="button" onClick={load}><RefreshCw size={14}/> Tentar novamente</button></div> : null}
    {!state.loading && !state.error && !state.items.length ? <div className="account-legal-documents-empty"><FileSignature size={17}/><span>Nenhuma assinatura formal pendente ou registrada para esta conta.</span></div> : null}
    {pending.length ? <div className="account-legal-signatures-required"><strong>Você tem {pending.length} assinatura{pending.length > 1 ? "s" : ""} aguardando ação</strong><span>Leia o documento integral antes de solicitar seu código de confirmação.</span></div> : null}
    {state.items.length ? <ul className="account-legal-documents-list account-legal-signatures-list">
      {state.items.map((entry) => {
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
          <div className="account-legal-signature-security"><MailCheck size={18}/><span><strong>Confirmação reforçada</strong><small>Para assinar, confirme sua senha atual e o código enviado ao e-mail desta conta.</small></span></div>
          <label className="account-legal-signature-check"><input type="checkbox" checked={form.acknowledged} onChange={(event) => { const acknowledged = event.target.checked; setForm((current) => ({ ...current, acknowledged, password: acknowledged ? current.password : "", code: "" })); setCodeSent(false); }}/>Li o documento integral e confirmo que estou assinando esta versão de forma consciente.</label>
          {form.acknowledged ? <>
            <label>Senha atual<input type="password" autoComplete="current-password" value={form.password} onChange={(event) => { setForm((current) => ({ ...current, password: event.target.value, code: "" })); setCodeSent(false); }}/></label>
            <button type="button" className="chip account-legal-signature-code-trigger" disabled={busy === "code" || !form.password} onClick={sendCode}>{busy === "code" ? "Confirmando senha e enviando…" : codeSent ? "Reenviar código para o meu e-mail" : form.password ? "Confirmar senha e disparar código" : "Disparar código para o meu e-mail"}</button>
            {!form.password ? <small className="account-legal-signature-code-hint">Informe sua senha atual para liberar o envio do código ao seu e-mail.</small> : null}
          </> : null}
          {codeSent ? <label>Código recebido por e-mail<input inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="000000"/></label> : null}
          <button type="button" className="auth-btn" disabled={busy === "sign" || !codeSent || !form.acknowledged || !form.password || !/^\d{6}$/.test(form.code)} onClick={sign}>{busy === "sign" ? "Registrando…" : "Assinar documento"}</button>
          <button type="button" className="account-legal-signature-decline-toggle" onClick={() => setForm((current) => ({ ...current, declining: !current.declining }))}>Não concordo com este documento</button>
          {form.declining ? <div className="account-legal-signature-decline"><label>Motivo da recusa<textarea minLength="10" value={form.declineReason} onChange={(event) => setForm((current) => ({ ...current, declineReason: event.target.value }))} placeholder="Explique o motivo para que a equipe possa analisar."/></label><button type="button" className="chip" disabled={busy === "decline" || form.declineReason.trim().length < 10} onClick={decline}>{busy === "decline" ? "Registrando…" : "Registrar recusa"}</button></div> : null}
        </>}
        {message ? <p className="account-legal-signature-message" role="status">{message}</p> : null}
      </section>
    </div> : null}
  </section>;
}
