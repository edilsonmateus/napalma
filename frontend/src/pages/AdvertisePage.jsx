import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { trackAnalyticsEvent } from "../services/analytics.service";
import { useAuthStore } from "../store/authStore";

const AUDIENCES = [
  ["Casas", "Impulsione agenda, noites especiais e campanhas de ocupação."],
  ["Produtores", "Leve eventos e projetos para quem já está buscando samba."],
  ["Marcas", "Entre em conversas culturais sem parecer invasivo."],
  ["Artistas", "Destaque datas, EPKs e momentos importantes da carreira."]
];

const STEPS = [
  ["1", "Solicite acesso", "Informe marca, tipo de anunciante e objetivo da campanha."],
  ["2", "Aguarde revisão", "A equipe 77Gira valida legitimidade, contexto e adequação."],
  ["3", "Crie campanhas", "Com a conta aprovada, você envia criativos e acompanha resultados."]
];

export default function AdvertisePage() {
  const user = useAuthStore((state) => state.user);
  const [showAccountGate, setShowAccountGate] = useState(false);

  useEffect(() => {
    trackAnalyticsEvent("advertise_page_view", { source: "advertise_page" });
  }, []);

  function trackAdvertiseClick(action) {
    trackAnalyticsEvent("advertise_cta_click", {
      source: "advertise_page",
      metadata: { action }
    });
  }

  function requestAdvertiserAccess(source) {
    trackAdvertiseClick(source);
    if (user) return;
    setShowAccountGate(true);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => document.getElementById("advertise-account-gate")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  }

  return (
    <section className="screen screen-history advertise-page">
      <header className="advertise-hero clean-card">
        <Link to="/explore" className="advertise-back-link">← Voltar ao 77Gira</Link>
        <div className="ads-brand-lockup" aria-label="77Gira Ads">
          <img src="/logoads77gira.svg" alt="77Gira Ads" className="ads-brand-logo" />
        </div>
        <h2>Publicidade para quem quer participar da cena, não apenas interromper.</h2>
        <p>
          O 77Gira conecta casas, artistas, produtores, marcas e público em torno da agenda real do samba.
          A publicidade entra com revisão, contexto e controle para preservar a experiência do usuário.
        </p>
        <div className="advertise-actions">
          {user ? (
            <Link to="/workspace/anunciante" className="btn-primary" onClick={() => trackAdvertiseClick("request_access_hero")}>Solicitar acesso</Link>
          ) : (
            <button type="button" className="btn-primary" onClick={() => requestAdvertiserAccess("request_access_hero")}>Solicitar acesso</button>
          )}
          {!user ? <Link to="/login" state={{ from: "/workspace/anunciante" }} className="chip" onClick={() => trackAdvertiseClick("login_hero")}>Já tenho conta</Link> : null}
        </div>
        {!user && showAccountGate ? (
          <div className="advertise-account-gate" id="advertise-account-gate" role="status">
            <div>
              <strong>Para solicitar acesso comercial, entre ou crie sua conta 77Gira.</strong>
              <p>Seu acesso identifica quem faz a solicitação e permite retomar este fluxo após a autenticação.</p>
            </div>
            <div className="advertise-account-gate__actions">
              <Link to="/login" state={{ from: "/workspace/anunciante" }} className="btn-primary" onClick={() => trackAdvertiseClick("login_required_gate")}>Faça login para solicitar acesso</Link>
              <Link to="/signup" state={{ from: "/workspace/anunciante" }} className="chip" onClick={() => trackAdvertiseClick("signup_required_gate")}>Criar conta 77Gira</Link>
            </div>
          </div>
        ) : null}
      </header>

      <div className="advertise-grid">
        <article className="clean-card advertise-principle-card">
          <span className="eyebrow">Como funciona</span>
          <h3>Nada é publicado automaticamente.</h3>
          <p>
            Toda conta anunciante passa por aprovação. Campanhas e criativos também podem exigir revisão antes de aparecerem
            em slots comerciais como Explorar, detalhe de casa e áreas futuras da plataforma.
          </p>
        </article>
        <article className="clean-card advertise-principle-card">
          <span className="eyebrow">Controle de marca</span>
          <h3>Contexto antes de volume.</h3>
          <p>
            O objetivo é permitir impulsionamentos coerentes com casas, eventos, artistas e campanhas institucionais,
            sem transformar o app em um mural genérico de anúncios.
          </p>
        </article>
      </div>

      <section className="advertise-section">
        <div className="advertise-section-heading">
          <span className="eyebrow">Para quem</span>
          <h3>Quatro entradas comerciais, uma regra de revisão.</h3>
        </div>
        <div className="advertise-audience-grid">
          {AUDIENCES.map(([title, description]) => (
            <article className="clean-card" key={title}>
              <strong>{title}</strong>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="advertise-section">
        <div className="advertise-section-heading">
          <span className="eyebrow">Fluxo seguro</span>
          <h3>O caminho até a campanha.</h3>
        </div>
        <div className="advertise-steps">
          {STEPS.map(([number, title, description]) => (
            <article className="clean-card" key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <aside className="clean-card advertise-access-note">
        <strong>Acesso ao workspace</strong>
        <p>
          O painel operacional fica em <code>/workspace/anunciante</code>. Visitantes recebem primeiro uma orientação
          para entrar ou criar uma conta e retornam automaticamente para concluir a solicitação comercial.
        </p>
      </aside>

      <footer className="clean-card advertise-final-card">
        <div>
          <span className="eyebrow">Próximo passo</span>
          <h3>Solicite sua conta anunciante.</h3>
          <p>Se você ainda não tem conta no 77Gira, crie seu acesso e volte automaticamente para concluir a solicitação comercial.</p>
        </div>
        <div className="advertise-actions">
          {user ? (
            <Link to="/workspace/anunciante" className="btn-primary" onClick={() => trackAdvertiseClick("request_access_footer")}>Começar agora</Link>
          ) : (
            <button type="button" className="btn-primary" onClick={() => requestAdvertiserAccess("request_access_footer")}>Solicitar acesso</button>
          )}
          <Link to="/signup" state={{ from: "/workspace/anunciante" }} className="chip" onClick={() => trackAdvertiseClick("signup_footer")}>Criar conta</Link>
        </div>
      </footer>
    </section>
  );
}
