import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { register } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { getRoleHome } from "../utils/roles";
import { getOrCreateVisitorId } from "../utils/visitor";
import { isReservedUsername, isUsernameSyntaxValid, RESERVED_USERNAME_MESSAGE } from "../utils/usernamePolicy";

export default function SignupPage() {
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    city: "",
    neighborhood: "",
    postalCode: ""
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    if (!isUsernameSyntaxValid(form.username)) {
      setMessage("Use de 3 a 40 caracteres: letras sem acento, números, ponto, hífen ou underline.");
      return;
    }
    if (isReservedUsername(form.username)) {
      setMessage(RESERVED_USERNAME_MESSAGE);
      return;
    }
    const location = { city: form.city.trim(), neighborhood: form.neighborhood.trim(), postalCode: form.postalCode.replace(/\D/g, "") };
    const locationStarted = Object.values(location).some(Boolean);
    if (locationStarted && (!location.city || !location.neighborhood || location.postalCode.length !== 8)) {
      setMessage("Para salvar sua localização-base, preencha cidade, bairro e um CEP válido.");
      return;
    }
    setIsLoading(true);
    try {
      const data = await register({ ...form, city: location.city || undefined, neighborhood: location.neighborhood || undefined, postalCode: location.postalCode || undefined, visitorId: getOrCreateVisitorId() });
      setAuth({ token: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      navigate(getRoleHome(data.user.role), { replace: true });
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível criar conta agora.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="auth-screen clean-card">
      <header className="page-header">
        <h2>Criar conta</h2>
        <p>Cadastre seu acesso para salvar radar, histórico e planos.</p>
      </header>

      <form className="venue-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={form.firstName}
          onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
          placeholder="Primeiro nome"
          required
        />
        <input
          type="text"
          value={form.lastName}
          onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
          placeholder="Sobrenome"
          required
        />
        <input
          type="text"
          value={form.username}
          onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
          placeholder="Usuário (mínimo 3 caracteres)"
          minLength={3}
          required
        />
        <input
          type="email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="E-mail"
          required
        />
        <input
          type="password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="Senha (mínimo 6 caracteres)"
          minLength={6}
          required
        />
        <p className="meta-line signup-location-intro">Localização-base opcional — necessária apenas para usar o Tô na Pista. Não pedimos endereço completo.</p>
        <input type="text" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder="Cidade (opcional)"/>
        <input type="text" value={form.neighborhood} onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))} placeholder="Bairro (opcional)"/>
        <input type="text" inputMode="numeric" value={form.postalCode} onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value.replace(/\D/g, "").slice(0, 8) }))} placeholder="CEP (opcional)"/>

        <div className="auth-actions">
          <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
            {isLoading ? "Criando..." : "Criar conta"}
          </button>
          <Link to="/login" className="auth-btn">Já tenho conta</Link>
          <Link to="/explore" className="auth-btn">Continuar sem conta</Link>
        </div>
      </form>

      {message ? <p className="empty">{message}</p> : null}

      <footer className="auth-settings-footer">
        <strong>77Gira v1.0.0</strong>
        <p>Feito em casa, feito com alma. Desenhado e codificado por 77 Giramundo © 2026. Todos os direitos reservados.</p>
      </footer>
    </section>
  );
}

