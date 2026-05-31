import { Compass, Clock3, Settings, Star, CalendarRange } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { isProducerRole, isVenueRole } from "../../utils/roles";

export default function BottomNav() {
  const user = useAuthStore((state) => state.user);
  const isProducer = isProducerRole(user?.role);
  const isVenue = isVenueRole(user?.role);

  const items = isProducer
    ? [
      { to: "/workspace/produtor", label: "Painel", icon: Compass },
      { to: "/settings/venues", label: "Gestão", icon: Star },
      { to: "/settings", label: "Config", icon: Settings }
    ]
    : isVenue
      ? [
        { to: "/workspace/casa", label: "Painel", icon: Compass },
      { to: "/settings/venues?section=events&layout=clean", label: "Programação", icon: Star },
        { to: "/settings", label: "Config", icon: Settings }
      ]
      : [
        { to: "/explore", label: "Explorar", icon: Compass },
        { to: "/pela-hora", label: "Pela Hora", icon: CalendarRange },
        { to: "/radar", label: "Meu Radar", icon: Star },
        { to: "/history", label: "Histórico", icon: Clock3 },
        { to: "/settings", label: "Config", icon: Settings }
      ];

  return (
    <nav className="bottom-nav">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
