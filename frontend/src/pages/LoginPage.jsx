import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { login } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { getRoleHome } from "../utils/roles";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@napalma.app" },
  { label: "Produtor", email: "produtor@napalma.app" },
  { label: "Casa", email: "casa@napalma.app" },
  { label: "Publico", email: "lia@napalma.app" }
];

export default function LoginPage() {
  const isProductionBuild = import.meta.env.PROD;
  const allowDemoAuth = import.meta.env.VITE_ENABLE_TEST_LOGIN === "true" || !isProductionBuild;
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
  const [email, setEmail] = useState(allowDemoAuth ? "lia@napalma.app" : "");
  const [password, setPassword] = useState(allowDemoAuth ? "123456" : "");
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
      const data = await login({ email, password });
      setAuth({ token: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      navigate(getRoleHome(data.user.role), { replace: true });
    } catch (error) {
      setMessage(error?.response?.data?.message || "Nao foi possivel entrar agora.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="auth-screen clean-card">
      <header className="page-header">
        <h2>Entrar</h2>
        <p>Use seu email e senha para acessar sua conta.</p>
      </header>

      {allowDemoAuth ? (
        <div className="demo-switches">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              className="chip"
              type="button"
              onClick={() => {
                setEmail(account.email);
                setPassword("123456");
              }}
            >
              {account.label}
            </button>
          ))}
        </div>
      ) : null}

      <form className="venue-form" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Senha"
          required
        />
        <div className="auth-actions">
          <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
          <Link to="/signup" className="auth-btn">Criar conta</Link>
          <Link to="/explore" className="auth-btn">Continuar sem conta</Link>
        </div>
      </form>

      {message ? <p className="empty">{message}</p> : null}
    </section>
  );
}
