import { useState } from "react";
import { Link } from "react-router-dom";
import { login, logout } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";

export default function SettingsPage() {
  const { token, refreshToken, user, setAuth, clearAuth } = useAuthStore();
  const [email, setEmail] = useState("admin@napalma.app");
  const [password, setPassword] = useState("123456");
  const [message, setMessage] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setMessage("");
    try {
      const data = await login({ email, password });
      setAuth({ token: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      setMessage(`Sessao ativa como ${data.user.role}.`);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Falha no login.");
    }
  }

  async function handleLogout() {
    setMessage("");
    try {
      if (refreshToken) {
        await logout({ refreshToken });
      }
    } catch (_error) {
      // no-op
    }
    clearAuth();
    setMessage("Sessao encerrada.");
  }

  return (
    <section>
      <header className="page-header">
        <h2>Configuracoes</h2>
      </header>
      <ul className="history-list">
        <li>Privacidade e consentimento</li>
        <li>Preferencias de samba</li>
        <li>Notificacoes</li>
        <li>Termos de uso</li>
      </ul>

      <form className="venue-form" onSubmit={handleLogin}>
        <h3 className="section-title">Autenticacao</h3>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" required />
        <div className="form-actions-inline">
          <button className="btn-primary" type="submit">Entrar</button>
          <button className="chip" type="button" onClick={handleLogout}>Sair</button>
        </div>
        {user ? <p className="empty">Usuario: {user.firstName} ({user.role})</p> : <p className="empty">Nenhum usuario autenticado.</p>}
        {token ? <p className="empty">Access token ativo.</p> : null}
        {message ? <p className="empty">{message}</p> : null}
      </form>

      <p><Link to="/settings/venues" className="btn-link">Gerenciar casas de samba</Link></p>
      <p className="empty">Nota: check-in por GPS esta fora do escopo deste MVP.</p>
    </section>
  );
}
