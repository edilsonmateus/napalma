import { CalendarRange, Clock3, Compass, Megaphone, Music2, Settings, Star, Store, Users } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;
  const isVenueWorkspace = path === "/workspace/casa" || path.startsWith("/settings/venues");
  const isProducerWorkspace = path.startsWith("/workspace/produtor");
  const isArtistWorkspace = path.startsWith("/workspace/artista");
  const isAdvertiserWorkspace = path.startsWith("/workspace/anunciante") || path === "/settings/ads";

  // A navegação pessoal é a base de toda conta autenticada. Menus reduzidos
  // só aparecem enquanto a pessoa está, de fato, em um workspace profissional.
  const items = isVenueWorkspace
    ? [
      { to: "/settings/venues?section=overview", label: "Painel", icon: Compass },
      { to: "/settings/venues?section=events&layout=clean", label: "Programação", icon: Star },
      { to: "/settings", label: "Gestão", icon: Store },
      { to: "/explore", label: "Meu 77Gira", icon: Compass }
    ]
    : isProducerWorkspace
      ? [
        { to: "/workspace/produtor", label: "Painel", icon: Compass },
        { to: "/settings/venues", label: "Casas", icon: Store },
        { to: "/settings", label: "Gestão", icon: Settings },
        { to: "/explore", label: "Meu 77Gira", icon: Compass }
      ]
      : isArtistWorkspace
        ? [
          { to: "/workspace/artista", label: "Perfil", icon: Music2 },
          { to: "/workspace/artista/equipe", label: "Equipe", icon: Users },
          { to: "/settings", label: "Gestão", icon: Settings },
          { to: "/explore", label: "Meu 77Gira", icon: Compass }
        ]
        : isAdvertiserWorkspace
          ? [
            { to: "/workspace/anunciante", label: "Anúncios", icon: Megaphone },
            { to: "/settings", label: "Gestão", icon: Settings },
            { to: "/explore", label: "Meu 77Gira", icon: Compass }
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
