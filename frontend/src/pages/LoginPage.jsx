import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Share2 } from "lucide-react";
import QRCode from "qrcode";
import { login, loginAsLocalAdmin } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { getRoleHome } from "../utils/roles";
import { promptInstallApp, subscribeInstallPrompt } from "../utils/installPrompt";
import { getOrCreateVisitorId } from "../utils/visitor";
import InstitutionalFooter from "../components/layout/InstitutionalFooter";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@napalma.app" },
  { label: "Produtor", email: "produtor@napalma.app" },
  { label: "Casa", email: "casa@napalma.app" },
  { label: "Público", email: "lia@napalma.app" }
];

export default function LoginPage() {
  const allowDemoAuth = import.meta.env.DEV && import.meta.env.VITE_ENABLE_TEST_LOGIN === "true";
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setAuth } = useAuthStore();
  const [email, setEmail] = useState(allowDemoAuth ? "lia@napalma.app" : "");
  const [password, setPassword] = useState(allowDemoAuth ? "123456" : "");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
  const redirectTo = useMemo(() => {
    const from = location.state?.from;
    if (typeof from === "string" && from.startsWith("/") && !from.startsWith("/login")) return from;
    return "";
  }, [location.state]);
  const securityNotice = useMemo(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("passwordReset") === "1") return "Senha redefinida com sucesso. Entre com sua nova senha.";
    if (params.get("securitySessionsRevoked") === "1") return "Suas sessões foram encerradas. Entre novamente para continuar.";
    if (params.get("passwordChanged") === "1") return "Senha alterada com sucesso. Entre novamente para continuar.";
    return "";
  }, [location.search]);

  if (user) {
    return <Navigate to={redirectTo || getRoleHome(user.role)} replace />;
  }

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

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      const data = await login({ email, password, visitorId: getOrCreateVisitorId() });
      setAuth({ token: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      navigate(redirectTo || getRoleHome(data.user.role), { replace: true });
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível entrar agora.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLocalAdminLogin() {
    if (!allowDemoAuth) return;
    setMessage("");
    setIsLoading(true);
    try {
      const data = await loginAsLocalAdmin();
      setAuth({ token: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      navigate("/settings/ads", { replace: true });
    } catch (error) {
      setMessage(error?.response?.data?.message || "Nao foi possivel iniciar a sessao Admin local.");
    } finally {
      setIsLoading(false);
    }
  }

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
    <section className="auth-screen">
      <header className="page-header">
        <h2>Entrar</h2>
        <p>Use seu email e senha para acessar sua conta.</p>
      </header>

      {allowDemoAuth ? (
        <div className="demo-switches">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              className="chip"
              type="button"
              onClick={() => {
                if (account.label === "Admin") {
                  handleLocalAdminLogin();
                  return;
                }
                setEmail(account.email);
                setPassword("123456");
              }}
              disabled={isLoading}
            >
              {account.label}
            </button>
          ))}
        </div>
      ) : null}

      <form className="venue-form" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Senha"
          required
        />
        <Link to="/forgot-password" className="auth-forgot-link">Esqueci minha senha</Link>
        <div className="auth-actions">
          <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
          <Link to="/signup" className="auth-btn auth-btn-strong">Criar conta</Link>
          <Link to="/anunciar" className="auth-btn">Anunciar no 77Gira</Link>
          <Link to="/explore" className="auth-btn">Continuar sem conta</Link>
        </div>
      </form>

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

      {message || securityNotice ? <p className="empty" role="status">{message || securityNotice}</p> : null}

      <p className="meta-line">
        Ao continuar, você concorda com nossos{" "}
        <Link to="/terms" className="btn-link">Termos de uso</Link>{" "}
        e{" "}
        <Link to="/privacy" className="btn-link">Política de privacidade</Link>.
      </p>

      {showQrModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="qr-title-login">
          <div className="modal-card route-mini-modal settings-qr-modal">
            <h3 id="qr-title-login">Compartilhe o 77Gira com o amiguinho, vai!</h3>
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

      <InstitutionalFooter className="auth-institutional-footer" />
    </section>
  );
}

