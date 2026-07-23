import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { requestPasswordReset } from "../services/auth.service";
import InstitutionalFooter from "../components/layout/InstitutionalFooter";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await requestPasswordReset(email);
      setMessage(response.message);
      setSubmitted(true);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível iniciar a recuperação agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-screen password-recovery-screen">
      <Link to="/login" className="back-link"><ArrowLeft size={16} /> Voltar para entrar</Link>
      <header className="page-header">
        <p className="auth-eyebrow">SEGURANÇA DA CONTA</p>
        <h2>Recupere sua senha</h2>
        <p>Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos um link seguro.</p>
      </header>

      <form className="venue-form password-recovery-form" onSubmit={handleSubmit}>
        <label htmlFor="recovery-email">E-mail</label>
        <input
          id="recovery-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@exemplo.com"
          autoComplete="email"
          disabled={busy || submitted}
          required
        />
        <button type="submit" className="auth-btn auth-btn-primary" disabled={busy || submitted}>
          {busy ? "Enviando..." : submitted ? "Instruções solicitadas" : "Enviar link de recuperação"}
        </button>
      </form>

      {message ? <div className={`auth-feedback ${submitted ? "auth-feedback-success" : "auth-feedback-error"}`} role="status">{message}</div> : null}

      {submitted ? (
        <div className="password-recovery-guidance">
          <strong>Confira também o spam e a lixeira.</strong>
          <p>O link expira em 30 minutos. Se precisar, você poderá solicitar outro após um breve intervalo.</p>
        </div>
      ) : null}

      <InstitutionalFooter className="auth-institutional-footer" />
    </section>
  );
}
