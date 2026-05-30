import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Share2 } from "lucide-react";
import QRCode from "qrcode";
import { logout } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { getRoleHome, isAdminRole, isProducerRole, isVenueRole } from "../utils/roles";
import { promptInstallApp, subscribeInstallPrompt } from "../utils/installPrompt";

export default function SettingsPage() {
  const { refreshToken, user, clearAuth } = useAuthStore();

  const roleHome = getRoleHome(user?.role);
  const canOpenVenuesPanel = Boolean(user) && (isAdminRole(user?.role) || isProducerRole(user?.role) || isVenueRole(user?.role));
  const qrCanvasRef = useRef(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showShareBtn, setShowShareBtn] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const appUrl = useMemo(() => {
    const configured = import.meta.env.VITE_PUBLIC_APP_URL;
    return configured || window.location.origin;
  }, []);

  useEffect(() => {
    // iOS Safari nao dispara beforeinstallprompt.
    // Nesses casos, compartilhamento nativo e QR Code sao os caminhos principais.
    return subscribeInstallPrompt(setShowInstallBtn);
  }, []);

  useEffect(() => {
    const canUseShare = typeof navigator !== "undefined"
      && typeof navigator.share === "function"
      && (typeof navigator.canShare !== "function" || navigator.canShare({ url: appUrl }));
    setShowShareBtn(canUseShare);
  }, [appUrl]);

  useEffect(() => {
    if (!showQrModal || !qrCanvasRef.current) return;
    QRCode.toCanvas(
      qrCanvasRef.current,
      appUrl,
      {
        width: 220,
        margin: 2,
        color: {
          dark: "#f4f6fb",
          light: "#0d0d0d"
        }
      }
    ).catch(() => {
      // no-op
    });
  }, [appUrl, showQrModal]);

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

  async function handleInstallApp() {
    await promptInstallApp();
    setShowInstallBtn(false);
  }

  async function handleNativeShare() {
    if (!showShareBtn) return;

    try {
      await navigator.share({
        title: "77Gira SP",
        text: "A amizade, nem mesmo a força do tempo irá destruir...\n\nSeu amigo é um verdadeiro amigo, ele está compartilhando com você a agenda organizada de sambas de São Paulo.\nValorize isto",
        url: appUrl
      });
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
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

      <div className="settings-content-stack">
        <div className="settings-list clean-card">
          <p>Privacidade</p>
          <p>Ajuda</p>
          <p>Avaliar</p>
          <p>Termos de uso</p>
          <p>Sobre</p>
        </div>

        <div className="settings-share-actions clean-card">
          {showInstallBtn ? (
            <button type="button" className="auth-btn settings-install-btn" onClick={handleInstallApp}>
              {/* TODO: inserir SVG do botao de instalacao (/installAppBtn.svg) */}
              <img src="/installAppBtn.svg" alt="" aria-hidden="true" className="settings-install-icon" />
              Instalar app
            </button>
          ) : null}

          {showShareBtn ? (
            <button type="button" className="auth-btn" onClick={handleNativeShare}>
              <Share2 size={16} aria-hidden="true" />
              Compartilhar app
            </button>
          ) : null}

          <button type="button" className="auth-btn" onClick={() => setShowQrModal(true)}>
            <img src="/qrCodeIco.svg" alt="" aria-hidden="true" className="settings-action-icon" />
            QR Code Pro Amigo
          </button>
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
      </div>

      {canOpenVenuesPanel ? <p><Link to="/settings/venues" className="btn-link">Gerenciar casas de samba</Link></p> : null}
      {isAdminRole(user?.role) ? <p><Link to="/settings/ads" className="btn-link">Gerenciar publicidade</Link></p> : null}
      {!user ? <p className="empty">Entre para manter seus dados sincronizados.</p> : null}

      {showQrModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="qr-title">
          <div className="modal-card route-mini-modal settings-qr-modal">
            <h3 id="qr-title">Compartilhe o 77Gira com o amiguinho, vai!</h3>
            <p className="meta-line">Aponte a camera para abrir o app no celular.</p>
            <div className="settings-qr-canvas-wrap">
              <canvas ref={qrCanvasRef} />
            </div>
            <button type="button" className="auth-btn" onClick={() => setShowQrModal(false)}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
