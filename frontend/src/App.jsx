import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import BottomNav from "./components/layout/BottomNav";
import { useTrackAudienceVisitMutation } from "./hooks/useEventsQuery";
import { getRoleHome, isAdminRole, isProducerRole, isVenueRole } from "./utils/roles";

const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage"));
const VenueDetailFlowPage = lazy(() => import("./pages/VenueDetailFlowPage"));
const ArtistProfilePage = lazy(() => import("./pages/ArtistProfilePage"));
const RadarPage = lazy(() => import("./pages/RadarPage"));
const PelaHoraPage = lazy(() => import("./pages/PelaHoraPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const VenuesAdminPage = lazy(() => import("./pages/VenuesAdminPage"));
const ProducerDashboardPage = lazy(() => import("./pages/ProducerDashboardPage"));
const AdsAdminPage = lazy(() => import("./pages/AdsAdminPage"));

const VISITOR_STORAGE_KEY = "napalma:visitor-id";
const VISIT_DAY_KEY = "napalma:last-visit-day";

function getOrCreateVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (existing) return existing;
    const id = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_STORAGE_KEY, id);
    return id;
  } catch (_error) {
    return `v_fallback_${Date.now().toString(36)}`;
  }
}

function RequireRole({ user, allowedRoles, children }) {
  if (!user) return <Navigate to="/settings" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={getRoleHome(user.role)} replace />;
  return children;
}

export default function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const user = useAuthStore((state) => state.user);
  const { mutate: trackAudienceVisit } = useTrackAudienceVisitMutation();
  const isBackofficeMode = isAdminRole(user?.role) || isProducerRole(user?.role) || isVenueRole(user?.role);

  function getDefaultRoute() {
    if (isProducerRole(user?.role)) return "/workspace/produtor";
    if (isVenueRole(user?.role)) return "/settings/venues?section=overview";
    return "/explore";
  }

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

  return (
    <div className={`app-shell ${isBackofficeMode ? "app-shell-admin" : ""}`}>
      {isOffline ? <div className="offline-banner">Voce esta offline. Algumas acoes podem falhar.</div> : null}
      <main className="app-content">
        <Suspense fallback={<div className="empty">Carregando pagina...</div>}>
          <Routes>
            <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/events/:eventId" element={<EventDetailPage />} />
            <Route path="/artists/:artistId" element={<ArtistProfilePage />} />
            <Route path="/venues/:venueId" element={<VenueDetailFlowPage />} />
            <Route path="/radar" element={<RadarPage />} />
            <Route path="/pela-hora" element={<PelaHoraPage />} />
            <Route
              path="/history"
              element={isVenueRole(user?.role) ? <Navigate to="/settings/venues?section=overview" replace /> : <HistoryPage />}
            />
            <Route path="/settings" element={<SettingsPage />} />
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
      <BottomNav />
    </div>
  );
}
