import { Link } from "react-router-dom";
import { logout } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { getRoleHome, isAdminRole, isProducerRole, isVenueRole } from "../utils/roles";

export default function SettingsPage() {
  const { refreshToken, user, clearAuth } = useAuthStore();

  const roleHome = getRoleHome(user?.role);
  const canOpenVenuesPanel = Boolean(user) && (isAdminRole(user?.role) || isProducerRole(user?.role) || isVenueRole(user?.role));

  async function handleLogout() {
    try {
      if (refreshToken) {
        await logout({ refreshToken });
      }
    } catch (_error) {
      // no-op
    }
    clearAuth();
  }

  return (
    <section>
      <header className="page-header">
        <h2>Configuracoes</h2>
      </header>
      <div className="settings-profile clean-card">
        <div className="settings-avatar">{user?.firstName?.[0] || "7"}</div>
        <div>
          <strong>{user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Sua conta"}</strong>
          <p>{user?.email || "Entre para sincronizar Radar e Historico."}</p>
        </div>
      </div>

      <div className="settings-list clean-card">
        <p>Privacidade</p>
        <p>Ajuda</p>
        <p>Avaliar</p>
        <p>Termos de uso</p>
        <p>Sobre</p>
      </div>

      <div className="auth-actions">
        {user ? (
          <>
            <Link to={roleHome} className="auth-btn">Ir para meu painel</Link>
            <button className="auth-btn" type="button" onClick={handleLogout}>Sair</button>
          </>
        ) : (
          <>
            <Link to="/login" className="auth-btn auth-btn-primary">Entrar</Link>
            <Link to="/signup" className="auth-btn">Criar conta</Link>
            <Link to="/explore" className="auth-btn">Continuar sem conta</Link>
          </>
        )}
      </div>

      {canOpenVenuesPanel ? <p><Link to="/settings/venues" className="btn-link">Gerenciar casas de samba</Link></p> : null}
      {isAdminRole(user?.role) ? <p><Link to="/settings/ads" className="btn-link">Gerenciar publicidade</Link></p> : null}
      {!user ? <p className="empty">Entre para manter seus dados sincronizados.</p> : null}
    </section>
  );
}
