import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { resetPassword } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import InstitutionalFooter from "../components/layout/InstitutionalFooter";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) {
      setMessage("Use pelo menos 8 caracteres na nova senha.");
      return;
    }
    if (password !== passwordConfirmation) {
      setMessage("As senhas precisam ser iguais.");
      return;
    }

    setBusy(true);
    try {
      const response = await resetPassword({ token, password, passwordConfirmation });
      clearAuth();
      setMessage(response.message);
      setCompleted(true);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível redefinir a senha. Solicite um novo link.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <section className="auth-screen password-recovery-screen">
        <header className="page-header">
          <p className="auth-eyebrow">LINK INCOMPLETO</p>
          <h2>Solicite um novo acesso</h2>
          <p>Este endereço não contém um token de recuperação válido.</p>
        </header>
        <Link to="/forgot-password" className="auth-btn auth-btn-primary">Solicitar novo link</Link>
        <InstitutionalFooter className="auth-institutional-footer" />
      </section>
    );
  }

  return (
    <section className="auth-screen password-recovery-screen">
      <Link to="/login" className="back-link"><ArrowLeft size={16} /> Voltar para entrar</Link>
      <header className="page-header">
        <p className="auth-eyebrow">SEGURANÇA DA CONTA</p>
        <h2>Crie uma nova senha</h2>
        <p>Use uma senha exclusiva, com pelo menos 8 caracteres.</p>
      </header>

      {!completed ? (
        <form className="venue-form password-recovery-form" onSubmit={handleSubmit}>
          <label htmlFor="new-password">Nova senha</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
          <label htmlFor="new-password-confirmation">Repita a nova senha</label>
          <input
            id="new-password-confirmation"
            type="password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
          <button type="submit" className="auth-btn auth-btn-primary" disabled={busy}>
            {busy ? "Salvando..." : "Redefinir senha"}
          </button>
        </form>
      ) : (
        <button type="button" className="auth-btn auth-btn-primary" onClick={() => navigate("/login?passwordReset=1", { replace: true })}>
          Entrar com a nova senha
        </button>
      )}

      {message ? <div className={`auth-feedback ${completed ? "auth-feedback-success" : "auth-feedback-error"}`} role="status">{message}</div> : null}
      <InstitutionalFooter className="auth-institutional-footer" />
    </section>
  );
}
