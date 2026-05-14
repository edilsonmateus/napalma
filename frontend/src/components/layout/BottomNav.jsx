import { Compass, Clock3, Settings, Star } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/explore", label: "Explorar", icon: Compass },
  { to: "/radar", label: "Meu Radar", icon: Star },
  { to: "/history", label: "Historico", icon: Clock3 },
  { to: "/settings", label: "Config", icon: Settings }
];

export default function BottomNav() {
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
