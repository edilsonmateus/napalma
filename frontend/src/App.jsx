import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import BottomNav from "./components/layout/BottomNav";
import { useTrackAudienceVisitMutation } from "./hooks/useEventsQuery";
import { me as fetchCurrentUser } from "./services/auth.service";
import { getRoleHome, isAdminRole, isProducerRole, isVenueRole } from "./utils/roles";
import { ONBOARDING_STORAGE_KEY } from "./utils/onboarding";
import { getOrCreateVisitorId } from "./utils/visitor";
import { setupInstallPromptCapture } from "./utils/installPrompt";
import { isDefinitiveSessionFailure } from "./utils/authSession";
import { apiHealthUrl } from "./services/api";
import { trackClientDiagnostic } from "./services/analytics.service";

const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage"));
const VenueDetailFlowPage = lazy(() => import("./pages/VenueDetailFlowPage"));
const ArtistProfilePage = lazy(() => import("./pages/ArtistProfilePage"));
const RadarPage = lazy(() => import("./pages/RadarPage"));
const PelaHoraPage = lazy(() => import("./pages/PelaHoraPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AccountSettingsPage = lazy(() => import("./pages/AccountSettingsPage"));
const PrivacyCenterPage = lazy(() => import("./pages/PrivacyCenterPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const AdvertisePage = lazy(() => import("./pages/AdvertisePage"));
const VenuesAdminPage = lazy(() => import("./pages/VenuesAdminPage"));
const ProducerDashboardPage = lazy(() => import("./pages/ProducerDashboardPage"));
const AdsAdminPage = lazy(() => import("./pages/AdsAdminPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const AdvertiserPortalPage = lazy(() => import("./pages/AdvertiserPortalPage"));
const MockPaymentPage = lazy(() => import("./pages/MockPaymentPage"));
const ArtistWorkspacePage = lazy(() => import("./pages/ArtistWorkspacePage"));
const ArtistBookingsPage = lazy(() => import("./pages/ArtistBookingsPage"));
const ArtistMediaPage = lazy(() => import("./pages/ArtistMediaPage"));
const ArtistInsightsPage = lazy(() => import("./pages/ArtistInsightsPage"));
const ArtistClaimDirectoryPage = lazy(() => import("./pages/ArtistClaimDirectoryPage"));
const ArtistTeamPage = lazy(() => import("./pages/ArtistTeamPage"));
const UsersAdminPage = lazy(() => import("./pages/UsersAdminPage"));

const VISIT_DAY_KEY = "napalma:last-visit-day";
const SPLASH_MS_MOBILE = 5000;
const SPLASH_MS_DESKTOP = 2000;

function RequireRole({ user, allowedRoles, children }) {
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  if (!user) return <Navigate to="/settings" replace />;
  if (sessionStatus === "degraded") return <Navigate to="/explore" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={getRoleHome(user.role)} replace />;
  return children;
}

function RequireAuth({ user, children }) {
  const location = useLocation();
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (sessionStatus === "degraded") return <Navigate to="/explore" replace />;
  return children;
}

export default function App() {
  const location = useLocation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    try {
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    } catch (_error) {
      return false;
    }
  });
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  const sessionMessage = useAuthStore((state) => state.sessionMessage);
  const setSessionStatus = useAuthStore((state) => state.setSessionStatus);
  const [authReady, setAuthReady] = useState(() => !useAuthStore.getState().token);
  const [sessionRetryNonce, setSessionRetryNonce] = useState(0);
  const [allowPublicWhileDegraded, setAllowPublicWhileDegraded] = useState(false);
  const [apiHealth, setApiHealth] = useState("checking");
  const { mutate: trackAudienceVisit } = useTrackAudienceVisitMutation();
  const isBackofficeMode = isAdminRole(user?.role) || isProducerRole(user?.role) || isVenueRole(user?.role);
  const isOnboardingRoute = location.pathname === "/onboarding";
  const isAdsRoute = location.pathname === "/anunciar"
    || location.pathname.startsWith("/workspace/anunciante")
    || location.pathname === "/settings/ads";
  const shouldForceOnboarding = !showSplash && !hasSeenOnboarding && !isOnboardingRoute;

  function getDefaultRoute() {
    if (isProducerRole(user?.role)) return "/workspace/produtor";
    if (isVenueRole(user?.role)) return "/settings/venues?section=overview";
    return "/explore";
  }

  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 900px)").matches;
    const timer = window.setTimeout(
      () => setShowSplash(false),
      isDesktop ? SPLASH_MS_DESKTOP : SPLASH_MS_MOBILE
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setupInstallPromptCapture();
  }, []);

  useEffect(() => {
    if (sessionStatus !== "degraded") setAllowPublicWhileDegraded(false);
  }, [sessionStatus]);

  useEffect(() => {
    let active = true;
    let retryTimer = null;

    async function checkApiHealth() {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 4500);
      try {
        const response = await fetch(`${apiHealthUrl}/health`, {
          signal: controller.signal,
          cache: "no-store"
        });
        if (!response.ok) throw new Error(`health_${response.status}`);
        if (active) setApiHealth("ready");
      } catch (error) {
        if (!active) return;
        setApiHealth("unavailable");
        trackClientDiagnostic("api_health_unavailable", {
          kind: error?.name === "AbortError" ? "timeout" : "network",
          route: location.pathname,
          message: String(error?.message || "health_check_failed")
        });
        retryTimer = window.setTimeout(checkApiHealth, 12000);
      } finally {
        window.clearTimeout(timeout);
      }
    }

    checkApiHealth();
    return () => {
      active = false;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [location.pathname]);

  useEffect(() => {
    function reportUnhandled(type, reason) {
      trackClientDiagnostic(type, {
        kind: "unhandled",
        route: window.location.pathname,
        message: String(reason?.message || reason || "unknown").slice(0, 120)
      });
    }
    const onError = (event) => reportUnhandled("unhandled_runtime_error", event.error || event.message);
    const onRejection = (event) => reportUnhandled("unhandled_runtime_error", event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let retryTimer = null;
    const retryDelays = [1500, 4000, 10000];

    async function syncSession(attempt = 0) {
      if (!token) {
        if (useAuthStore.getState().user || useAuthStore.getState().refreshToken) clearAuth();
        if (active) setAuthReady(true);
        return;
      }

      if (isOffline) {
        setSessionStatus("degraded", "Você está offline. Sua sessão será validada quando a conexão voltar.");
        if (active) setAuthReady(true);
        return;
      }

      setSessionStatus("checking", "Validando sua sessão...");
      if (active) setAuthReady(false);
      try {
        const currentUser = await fetchCurrentUser();
        if (!active) return;
        const latestAuth = useAuthStore.getState();
        setAuth({
          token: latestAuth.token || token,
          refreshToken: latestAuth.refreshToken || refreshToken,
          user: currentUser
        });
      } catch (error) {
        if (!active) return;
        if (isDefinitiveSessionFailure(error)) {
          clearAuth();
        } else {
          setSessionStatus("degraded", "Não foi possível validar sua sessão agora. Tentaremos novamente.");
          if (attempt < retryDelays.length) {
            retryTimer = window.setTimeout(() => syncSession(attempt + 1), retryDelays[attempt]);
          }
        }
      } finally {
        if (active) setAuthReady(true);
      }
    }

    setAuthReady(!token);
    syncSession();

    return () => {
      active = false;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [clearAuth, isOffline, refreshToken, sessionRetryNonce, setAuth, setSessionStatus, token]);

  useEffect(() => {
    if (!isOnboardingRoute) return;
    try {
      if (localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true") {
        setHasSeenOnboarding(true);
      }
    } catch (_error) {
      // no-op
    }
  }, [isOnboardingRoute, location.key]);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOffline) return;
    const dayKey = new Date().toISOString().slice(0, 10);
    try {
      const lastDay = localStorage.getItem(VISIT_DAY_KEY);
      if (lastDay === dayKey) return;
      localStorage.setItem(VISIT_DAY_KEY, dayKey);
    } catch (_error) {
      // no-op
    }
    trackAudienceVisit({ visitorId: getOrCreateVisitorId() });
  }, [isOffline, trackAudienceVisit, user?.id]);

  if (showSplash) {
    return (
      <section className="splash-screen">
        <video
          className="splash-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/assets/onboarding/splash-bg.webp"
          aria-hidden="true"
        >
          <source src="/assets/onboarding/videoSplash77Gira.mp4" type="video/mp4" />
        </video>
        <div className="splash-overlay" aria-hidden="true" />
        <div className="splash-logo-wrap">
          <img src="/assets/brand/logoBase77Gira.svg" alt="77Gira" className="splash-logo" />
          <p>Todos os sambas aqui</p>
        </div>
      </section>
    );
  }

  if (shouldForceOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (token && (!authReady || sessionStatus === "checking")) {
    return <div className="session-validation-screen"><span className="session-validation-spinner"/><strong>Validando sua sessão...</strong></div>;
  }

  if (token && sessionStatus === "degraded" && !allowPublicWhileDegraded) {
    return (
      <div className="session-validation-screen session-validation-degraded">
        <strong>Sua conta continua conectada</strong>
        <p>{sessionMessage || "O serviço está temporariamente indisponível. Seus dados de acesso foram preservados."}</p>
        <div className="session-validation-actions">
          <button className="auth-btn auth-btn-primary" type="button" onClick={() => setSessionRetryNonce((value) => value + 1)}>Tentar novamente</button>
          <button className="chip" type="button" onClick={() => setAllowPublicWhileDegraded(true)}>Continuar no Explorar</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell ${isBackofficeMode ? "app-shell-admin" : ""} ${isAdsRoute ? "app-shell-ads" : ""}`}>
      {isOffline ? <div className="offline-banner">Você está offline. Algumas ações podem falhar.</div> : null}
      {!isOffline && apiHealth === "unavailable" ? <div className="offline-banner api-health-banner">Estamos reconectando aos serviços. Você pode continuar navegando.</div> : null}
      <main className="app-content">
        <Suspense fallback={<div className="empty">Carregando pagina...</div>}>
          <Routes>
            <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/events/:eventId" element={<EventDetailPage />} />
            <Route path="/artists/:artistId" element={<ArtistProfilePage />} />
            <Route path="/artistas/:artistId" element={<ArtistProfilePage />} />
            <Route path="/venues/:venueId" element={<VenueDetailFlowPage />} />
            <Route path="/radar" element={<RadarPage />} />
            <Route path="/pela-hora" element={<PelaHoraPage />} />
            <Route
              path="/history"
              element={isVenueRole(user?.role) ? <Navigate to="/settings/venues?section=overview" replace /> : <HistoryPage />}
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/anunciar" element={<AdvertisePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/account" element={<RequireAuth user={user}><AccountSettingsPage /></RequireAuth>} />
            <Route path="/settings/privacy" element={<RequireAuth user={user}><PrivacyCenterPage /></RequireAuth>} />
            <Route path="/reivindicar-artista" element={<RequireAuth user={user}><ArtistClaimDirectoryPage /></RequireAuth>} />
            <Route path="/settings/users" element={isAdminRole(user?.role) ? <UsersAdminPage /> : <Navigate to="/settings" replace />} />
            <Route path="/workspace/anunciante" element={<RequireAuth user={user}><AdvertiserPortalPage /></RequireAuth>} />
            <Route path="/workspace/anunciante/campanhas" element={<RequireAuth user={user}><AdvertiserPortalPage /></RequireAuth>} />
            <Route path="/workspace/anunciante/novo-anuncio" element={<RequireAuth user={user}><AdvertiserPortalPage /></RequireAuth>} />
            <Route path="/workspace/anunciante/carteira" element={<RequireAuth user={user}><AdvertiserPortalPage /></RequireAuth>} />
            <Route path="/workspace/anunciante/pagamento/mock/:orderId" element={<RequireAuth user={user}><MockPaymentPage /></RequireAuth>} />
            <Route path="/workspace/artista" element={<RequireAuth user={user}><ArtistWorkspacePage /></RequireAuth>} />
            <Route path="/workspace/artista/contratacoes" element={<RequireAuth user={user}><ArtistBookingsPage /></RequireAuth>} />
            <Route path="/workspace/artista/midia" element={<RequireAuth user={user}><ArtistMediaPage /></RequireAuth>} />
            <Route path="/workspace/artista/desempenho" element={<RequireAuth user={user}><ArtistInsightsPage /></RequireAuth>} />
            <Route path="/workspace/artista/equipe" element={<RequireAuth user={user}><ArtistTeamPage /></RequireAuth>} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route
              path="/workspace/produtor"
              element={(
                <RequireRole user={user} allowedRoles={["admin", "produtor", "producer"]}>
                  <ProducerDashboardPage />
                </RequireRole>
              )}
            />
            <Route
              path="/workspace/casa"
              element={(
                <RequireRole user={user} allowedRoles={["admin", "casa", "produtor", "venue_manager", "producer"]}>
                  <VenuesAdminPage />
                </RequireRole>
              )}
            />
            <Route
              path="/settings/venues"
              element={(
                <RequireRole user={user} allowedRoles={["admin", "produtor", "casa", "producer", "venue_manager"]}>
                  <VenuesAdminPage />
                </RequireRole>
              )}
            />
            <Route
              path="/settings/ads"
              element={(
                <RequireRole user={user} allowedRoles={["admin"]}>
                  <AdsAdminPage />
                </RequireRole>
              )}
            />
            <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
          </Routes>
        </Suspense>
      </main>
      {!isOnboardingRoute ? <BottomNav /> : null}
    </div>
  );
}
