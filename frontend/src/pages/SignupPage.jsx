import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { register } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { getRoleHome } from "../utils/roles";

export default function SignupPage() {
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      const data = await register(form);
      setAuth({ token: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      navigate(getRoleHome(data.user.role), { replace: true });
    } catch (error) {
      setMessage(error?.response?.data?.message || "Nao foi possivel criar conta agora.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="auth-screen clean-card">
      <header className="page-header">
        <h2>Criar conta</h2>
        <p>Cadastre seu acesso para salvar radar, historico e planos.</p>
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
          type="email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="Senha (minimo 6 caracteres)"
          minLength={6}
          required
        />

        <div className="auth-actions">
          <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
            {isLoading ? "Criando..." : "Criar conta"}
          </button>
          <Link to="/login" className="auth-btn">Ja tenho conta</Link>
          <Link to="/explore" className="auth-btn">Continuar sem conta</Link>
        </div>
      </form>

      {message ? <p className="empty">{message}</p> : null}
    </section>
  );
}
