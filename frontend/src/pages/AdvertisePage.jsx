import { useEffect } from "react";
import { Link } from "react-router-dom";
import { trackAnalyticsEvent } from "../services/analytics.service";

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
  useEffect(() => {
    trackAnalyticsEvent("advertise_page_view", { source: "advertise_page" });
  }, []);

  function trackAdvertiseClick(action) {
    trackAnalyticsEvent("advertise_cta_click", {
      source: "advertise_page",
      metadata: { action }
    });
  }

  return (
    <section className="screen screen-history advertise-page">
      <header className="advertise-hero clean-card">
        <span className="eyebrow">77Gira Ads</span>
        <h2>Publicidade para quem quer participar da cena, não apenas interromper.</h2>
        <p>
          O 77Gira conecta casas, artistas, produtores, marcas e público em torno da agenda real do samba.
          A publicidade entra com revisão, contexto e controle para preservar a experiência do usuário.
        </p>
        <div className="advertise-actions">
          <Link to="/workspace/anunciante" className="btn-primary" onClick={() => trackAdvertiseClick("request_access_hero")}>Solicitar acesso</Link>
          <Link to="/login" state={{ from: "/workspace/anunciante" }} className="chip" onClick={() => trackAdvertiseClick("login_hero")}>Já tenho conta</Link>
        </div>
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
          O painel operacional fica em <code>/workspace/anunciante</code>. Se você ainda não estiver logado,
          o app vai pedir login e retornar para a solicitação comercial.
        </p>
      </aside>

      <footer className="clean-card advertise-final-card">
        <div>
          <span className="eyebrow">Próximo passo</span>
          <h3>Solicite sua conta anunciante.</h3>
          <p>Se você ainda não tem conta no 77Gira, crie uma conta comum e volte para concluir a solicitação comercial.</p>
        </div>
        <div className="advertise-actions">
          <Link to="/workspace/anunciante" className="btn-primary" onClick={() => trackAdvertiseClick("request_access_footer")}>Começar agora</Link>
          <Link to="/signup" className="chip" onClick={() => trackAdvertiseClick("signup_footer")}>Criar conta</Link>
        </div>
      </footer>
    </section>
  );
}
