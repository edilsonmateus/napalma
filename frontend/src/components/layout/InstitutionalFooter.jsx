import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { listPublicStrategicPartners } from "../../services/strategicPartners.service";

export default function InstitutionalFooter({ className = "" }) {
  const user = useAuthStore((state) => state.user);
  const privacyDataPath = user ? "/settings/privacy" : "/privacy";
  const [hasPartners, setHasPartners] = useState(false);

  useEffect(() => {
    let active = true;
    listPublicStrategicPartners()
      .then((items) => { if (active) setHasPartners(items.length > 0); })
      .catch(() => { if (active) setHasPartners(false); });
    return () => { active = false; };
  }, []);

  return (
    <footer className={`account-footer institutional-footer ${className}`.trim()}>
      <nav className="account-footer__links" aria-label="Suporte, informações institucionais e documentos legais">
        <Link to="/help">Ajuda</Link>
        <Link to="/anunciar">Anunciar no 77Gira</Link>
        <Link to={privacyDataPath}>Privacidade e dados</Link>
        <Link to="/privacy">Privacidade</Link>
        <Link to="/terms">Termos de Uso</Link>
        <Link to="/about">Sobre o 77Gira</Link>
        {hasPartners ? <Link to="/parceiros">Parceiros</Link> : null}
      </nav>
      <div className="account-footer__meta">
        <strong>77Gira v1.0.0</strong>
        <p>Feito em casa, feito com alma.</p>
        <small>Desenhado e codificado por 77 Giramundo</small>
        <small>© 2026 Todos os direitos reservados.</small>
      </div>
    </footer>
  );
}
