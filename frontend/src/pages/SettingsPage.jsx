import { useState } from "react";
import { Link } from "react-router-dom";
import { login, logout } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { getRoleHome, isAdminRole, isProducerRole, isVenueRole } from "../utils/roles";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@napalma.app" },
  { label: "Produtor", email: "produtor@napalma.app" },
  { label: "Casa", email: "casa@napalma.app" },
  { label: "Publico", email: "lia@napalma.app" }
];

export default function SettingsPage() {
  const isProductionBuild = import.meta.env.PROD;
  const allowDemoAuth = import.meta.env.VITE_ENABLE_TEST_LOGIN === "true" || !isProductionBuild;
  const { refreshToken, user, setAuth, clearAuth } = useAuthStore();
  const [email, setEmail] = useState(allowDemoAuth ? "admin@napalma.app" : "");
  const [password, setPassword] = useState(allowDemoAuth ? "123456" : "");
  const [message, setMessage] = useState("");

  const roleHome = getRoleHome(user?.role);
  const canOpenVenuesPanel = Boolean(user) && (isAdminRole(user?.role) || isProducerRole(user?.role) || isVenueRole(user?.role));

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
      <div className="settings-links">
        <p>Privacidade e consentimento</p>
        <p>Preferencias de samba</p>
        <p>Notificacoes</p>
        <p>Termos de uso</p>
      </div>

      <form className="venue-form" onSubmit={handleLogin}>
        <h3 className="section-title">Autenticacao</h3>
        {allowDemoAuth ? (
          <>
            <p className="meta-line">Modo teste ativo: escolha um perfil para preencher o acesso de QA.</p>
            <div className="demo-switches">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  className="chip"
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword("123456");
                  }}
                >
                  {account.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="meta-line">Acesse com sua conta real (email e senha).</p>
        )}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" required />
        <div className="auth-actions">
          <button className="auth-btn auth-btn-primary" type="submit">Entrar</button>
          <button className="auth-btn" type="button" onClick={handleLogout}>Sair</button>
          {user ? <Link to={roleHome} className="auth-btn">Ir para meu painel</Link> : null}
        </div>
        {user ? (
          <p className="empty">Sessao atual: {user.firstName} ({user.role}).</p>
        ) : (
          <p className="empty">Voce ainda nao entrou. Escolha um perfil e faca login.</p>
        )}
        {message ? <p className="empty">{message}</p> : null}
      </form>

      {canOpenVenuesPanel ? <p><Link to="/settings/venues" className="btn-link">Gerenciar casas de samba</Link></p> : null}
      {isAdminRole(user?.role) ? <p><Link to="/settings/ads" className="btn-link">Gerenciar publicidade</Link></p> : null}
      <p className="empty">Nota: check-in por GPS esta fora do escopo deste MVP.</p>
    </section>
  );
}
