import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <section className="screen">
      <header className="page-header">
        <h2>Sobre</h2>
        <p>O 77Gira organiza a agenda de samba da cidade em um fluxo simples e acionável.</p>
      </header>

      <article className="clean-card legal-card">
        <h3>Missão</h3>
        <p>Conectar público, casas e produtores em torno da cultura do samba, com informação clara, atual e útil para decisão em tempo real.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>Proposta</h3>
        <p>Descobrir o que está rolando agora, planejar rolês, compartilhar com amigos e fortalecer a cena local com operação organizada.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>Versao</h3>
        <p>77Gira v1.0.0</p>
      </article>

      <p><Link to="/settings" className="btn-link">Voltar para Configurações</Link></p>
    </section>
  );
}
