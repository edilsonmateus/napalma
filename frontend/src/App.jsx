import { Navigate, Route, Routes } from "react-router-dom";
import ExplorePage from "./pages/ExplorePage";
import EventDetailPage from "./pages/EventDetailPage";
import RadarPage from "./pages/RadarPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import VenuesAdminPage from "./pages/VenuesAdminPage";
import BottomNav from "./components/layout/BottomNav";

export default function App() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <Routes>
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/radar" element={<RadarPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/venues" element={<VenuesAdminPage />} />
          <Route path="*" element={<Navigate to="/explore" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
