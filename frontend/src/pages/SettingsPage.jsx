import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MoreVertical, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useAuthStore } from "../store/authStore";
import { isAdminRole, isProducerRole, isVenueRole } from "../utils/roles";
import { promptInstallApp, subscribeInstallPrompt } from "../utils/installPrompt";
import ManagementHub from "../components/settings/ManagementHub";

export default function SettingsPage() {
  const { user } = useAuthStore();

  const canOpenVenuesPanel = Boolean(user) && (isAdminRole(user?.role) || isProducerRole(user?.role) || isVenueRole(user?.role));
  const qrCanvasRef = useRef(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showShareBtn, setShowShareBtn] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const isMobileLike = useMemo(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    return Boolean(mobileUa || coarse);
  }, []);
  const appUrl = useMemo(() => {
    const configured = import.meta.env.VITE_PUBLIC_APP_URL;
    return configured || window.location.origin;
  }, []);

  useEffect(() => {
    // iOS Safari não dispara beforeinstallprompt.
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

  async function handleInstallApp() {
    if (!isMobileLike) {
      setShowQrModal(true);
      return;
    }
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
    <section className="settings-screen">
      <header className="page-header">
        <h2>Configurações</h2>
      </header>
      <div className="settings-profile clean-card">
        <div className="settings-avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt=""/> : user?.firstName?.[0] || "7"}</div>
        <div>
          <strong>{user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Sua conta"}</strong>
          {user ? <p>{user.email}</p> : null}
          {!user ? (
            <div className="settings-inline-note" role="note" aria-live="polite">
              <span className="settings-info-icon" aria-hidden="true">i</span>
              <p>Entre para manter seus dados sincronizados e ver mais recursos do app.</p>
            </div>
          ) : null}
        </div>
        {user ? <Link className="settings-account-menu" to="/settings/account" aria-label="Abrir conta e preferências"><MoreVertical size={22}/></Link> : null}
      </div>

      <div className="settings-content-stack">
        <div className="settings-share-actions clean-card">
          {isMobileLike ? (
            showInstallBtn ? (
              <button type="button" className="settings-install-image-btn" onClick={handleInstallApp} aria-label="Instalar app">
                {/* TODO: inserir SVG do botao de instalacao (/installAppBtn.svg) */}
                <img src="/installAppBtn.svg" alt="" aria-hidden="true" className="settings-install-image" />
              </button>
            ) : null
          ) : (
            <button type="button" className="auth-btn" onClick={handleInstallApp}>
              Instalar no celular
            </button>
          )}

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

        <ManagementHub user={user} canManageVenues={canOpenVenuesPanel} canManageAds={isAdminRole(user?.role)} canManageUsers={isAdminRole(user?.role)}/>

        {!user ? <div className="auth-actions">
            <>
              <Link to="/login" className="auth-btn auth-btn-primary">Entrar</Link>
              <Link to="/signup" className="auth-btn auth-btn-strong">Criar conta</Link>
              <Link to="/explore" className="auth-btn">Continuar sem conta</Link>
            </>
        </div> : null}
      </div>

      {showQrModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="qr-title">
          <div className="modal-card route-mini-modal settings-qr-modal">
            <h3 id="qr-title">Compartilhe o 77Gira com o amiguinho, vai!</h3>
            <p className="meta-line">Aponte a câmera para abrir o app no celular.</p>
            <div className="settings-qr-canvas-wrap">
              <canvas ref={qrCanvasRef} />
            </div>
            <button type="button" className="auth-btn" onClick={() => setShowQrModal(false)}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}

      <footer className="auth-settings-footer">
        <strong>77Gira v1.0.0</strong>
        <p>Feito em casa, feito com alma. Desenhado e codificado por 77 Giramundo © 2026 Todos os direitos reservados.</p>
      </footer>
    </section>
  );
}

