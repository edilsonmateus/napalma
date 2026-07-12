import { Component } from "react";
import { trackClientDiagnostic } from "../../services/analytics.service";

const CHUNK_RELOAD_KEY = "77gira:chunk-reload-at";
const CHUNK_RELOAD_WINDOW_MS = 10 * 60 * 1000;

function isChunkLoadFailure(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("failed to fetch dynamically imported module")
    || message.includes("loading chunk")
    || message.includes("chunkloaderror")
    || message.includes("importing a module script failed");
}

function canReloadForChunk() {
  try {
    const lastAttempt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - lastAttempt < CHUNK_RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    return true;
  } catch (_error) {
    return false;
  }
}

export default class AppErrorBoundary extends Component {
  state = { error: null, hasRetriedChunk: false };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const chunkFailure = isChunkLoadFailure(error);
    trackClientDiagnostic("render_error", {
      kind: chunkFailure ? "chunk" : "render",
      route: window.location.pathname,
      message: String(error?.message || "unknown").slice(0, 120)
    });

    if (chunkFailure && canReloadForChunk()) {
      this.setState({ hasRetriedChunk: true });
      window.setTimeout(() => window.location.reload(), 150);
    }

    // Keep the component stack available in development without exposing it to users.
    if (import.meta.env.DEV) console.error("77Gira render failure", error, info);
  }

  handleRetry = () => {
    this.setState({ error: null, hasRetriedChunk: false });
  };

  handleGoHome = () => {
    window.location.assign("/explore");
  };

  render() {
    const { error, hasRetriedChunk } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="app-recovery-screen" role="alert" aria-live="assertive">
        <div className="app-recovery-card">
          <p className="eyebrow">RECUPERAÇÃO SEGURA</p>
          <h1>{hasRetriedChunk ? "Atualizando o 77Gira" : "Não foi possível abrir esta tela"}</h1>
          <p>
            {hasRetriedChunk
              ? "Estamos carregando a versão mais recente do aplicativo."
              : "Sua conta e seus dados continuam preservados. Tente novamente ou volte para o Explorar."}
          </p>
          <div className="app-recovery-actions">
            <button type="button" className="auth-btn auth-btn-primary" onClick={this.handleRetry}>Tentar novamente</button>
            <button type="button" className="chip" onClick={this.handleGoHome}>Ir para Explorar</button>
          </div>
        </div>
      </main>
    );
  }
}
