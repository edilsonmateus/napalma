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

const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage"));
const VenueDetailFlowPage = lazy(() => import("./pages/VenueDetailFlowPage"));
const ArtistProfilePage = lazy(() => import("./pages/ArtistProfilePage"));
const RadarPage = lazy(() => import("./pages/RadarPage"));
const PelaHoraPage = lazy(() => import("./pages/PelaHoraPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const VenuesAdminPage = lazy(() => import("./pages/VenuesAdminPage"));
const ProducerDashboardPage = lazy(() => import("./pages/ProducerDashboardPage"));
const AdsAdminPage = lazy(() => import("./pages/AdsAdminPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const AdvertiserPortalPage = lazy(() => import("./pages/AdvertiserPortalPage"));
const ArtistWorkspacePage = lazy(() => import("./pages/ArtistWorkspacePage"));
const ArtistBookingsPage = lazy(() => import("./pages/ArtistBookingsPage"));
const ArtistMediaPage = lazy(() => import("./pages/ArtistMediaPage"));

const VISIT_DAY_KEY = "napalma:last-visit-day";
const SPLASH_MS_MOBILE = 5000;
const SPLASH_MS_DESKTOP = 2000;

function RequireRole({ user, allowedRoles, children }) {
  if (!user) return <Navigate to="/settings" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={getRoleHome(user.role)} replace />;
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
  const [authReady, setAuthReady] = useState(() => !useAuthStore.getState().token);
  const { mutate: trackAudienceVisit } = useTrackAudienceVisitMutation();
  const isBackofficeMode = isAdminRole(user?.role) || isProducerRole(user?.role) || isVenueRole(user?.role);
  const isOnboardingRoute = location.pathname === "/onboarding";
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
    let active = true;

    async function syncSession() {
      if (!token) {
        clearAuth();
        if (active) setAuthReady(true);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        if (!active) return;
        const latestAuth = useAuthStore.getState();
        setAuth({
          token: latestAuth.token || token,
          refreshToken: latestAuth.refreshToken || refreshToken,
          user: currentUser
        });
      } catch (_error) {
        if (!active) return;
        clearAuth();
      } finally {
        if (active) setAuthReady(true);
      }
    }

    setAuthReady(!token);
    syncSession();

    return () => {
      active = false;
    };
  }, [clearAuth, refreshToken, setAuth, token]);

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

  if (!authReady) {
    return <div className="empty">Validando sessao...</div>;
  }

  return (
    <div className={`app-shell ${isBackofficeMode ? "app-shell-admin" : ""}`}>
      {isOffline ? <div className="offline-banner">Você está offline. Algumas ações podem falhar.</div> : null}
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
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/workspace/anunciante" element={user ? <AdvertiserPortalPage /> : <Navigate to="/login" replace />} />
            <Route path="/workspace/artista" element={user ? <ArtistWorkspacePage /> : <Navigate to="/login" replace />} />
            <Route path="/workspace/artista/contratacoes" element={user ? <ArtistBookingsPage /> : <Navigate to="/login" replace />} />
            <Route path="/workspace/artista/midia" element={user ? <ArtistMediaPage /> : <Navigate to="/login" replace />} />
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
