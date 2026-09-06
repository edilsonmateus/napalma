import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { getRegionalAdsDecision, setRegionalAdsDecision } from "../services/privacy.service";
import { useAuthStore } from "../store/authStore";
import { getRoleHome } from "../utils/roles";

function safeDestination(value, fallback) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("/onboarding/publicidade-regional")) return fallback;
  return value;
}

export default function RegionalAdsOnboardingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, refreshToken, user, setAuth } = useAuthStore();
  const destination = useMemo(
    () => safeDestination(location.state?.from, getRoleHome(user?.role)),
    [location.state?.from, user?.role]
  );
  const [state, setState] = useState("loading");
  const [city, setCity] = useState(user?.city || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) return undefined;
    getRegionalAdsDecision()
      .then((item) => {
        if (!active) return;
        setCity(item.city || user.city || "");
        setState(item.decided ? "decided" : "ready");
      })
      .catch(() => {
        // Não prende uma sessão existente em caso de falha temporária. O App
        // também trata a indisponibilidade como elegível apenas para anúncios gerais.
        if (active) setState("unavailable");
      });
    return () => { active = false; };
  }, [user?.id, user?.city]);

  useEffect(() => {
    if (state === "decided") navigate(destination, { replace: true });
  }, [destination, navigate, state]);

  if (!user) return <Navigate to="/login" replace state={{ from: "/onboarding/publicidade-regional" }} />;
  if (state === "loading") return <section className="auth-screen clean-card"><p className="meta-line">Preparando sua experiência...</p></section>;
  if (state === "unavailable") return <Navigate to={destination} replace />;

  async function decide(isGranted) {
    setMessage("");
    if (isGranted && city.trim().length < 2) {
      setMessage("Informe sua cidade-base para receber campanhas da sua região.");
      return;
    }
    setBusy(true);
    try {
      const result = await setRegionalAdsDecision({ isGranted, ...(isGranted ? { city: city.trim() } : {}) });
      if (result.account?.city && result.account.city !== user.city) {
        setAuth({ token, refreshToken, user: { ...user, city: result.account.city } });
      }
      navigate(destination, { replace: true });
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível salvar sua escolha agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const hasCity = city.trim().length >= 2;
  return (
    <section className="auth-screen clean-card regional-ads-onboarding">
      <header className="page-header">
        <h2>Ajude o samba a continuar girando</h2>
        <p>O 77Gira é gratuito para quem descobre, faz e vive o samba. Ao permitir campanhas da sua região, você recebe divulgações mais próximas da sua agenda e ajuda a manter o app acessível para toda a comunidade.</p>
      </header>

      <div className="regional-ads-onboarding-copy">
        <p>Usaremos somente sua cidade-base para encontrar campanhas regionais. Anunciantes não recebem seus dados pessoais.</p>
        {!hasCity ? <label>Cidade-base<input value={city} maxLength={120} onChange={(event) => setCity(event.target.value)} placeholder="Ex.: São Paulo" autoComplete="address-level2" /></label> : null}
      </div>

      <div className="auth-actions regional-ads-onboarding-actions">
        <button className="auth-btn auth-btn-primary" type="button" disabled={busy} onClick={() => decide(true)}>
          {busy ? "Salvando..." : "Quero ver campanhas da minha região"}
        </button>
        <button className="auth-btn" type="button" disabled={busy} onClick={() => decide(false)}>
          Continuar com anúncios gerais
        </button>
      </div>

      {message ? <p className="empty" role="alert">{message}</p> : null}
      <p className="meta-line regional-ads-onboarding-footer">Você pode mudar essa preferência a qualquer momento em <Link to="/settings/privacy">Privacidade</Link>.</p>
    </section>
  );
}
