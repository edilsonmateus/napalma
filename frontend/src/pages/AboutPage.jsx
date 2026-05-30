import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <section className="screen">
      <header className="page-header">
        <h2>Sobre</h2>
        <p>O 77Gira organiza a agenda de samba da cidade em um fluxo simples e acionavel.</p>
      </header>

      <article className="clean-card legal-card">
        <h3>Missao</h3>
        <p>Conectar publico, casas e produtores em torno da cultura do samba, com informacao clara, atual e util para decisao em tempo real.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>Proposta</h3>
        <p>Descobrir o que esta rolando agora, planejar roles, compartilhar com amigos e fortalecer a cena local com operacao organizada.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>Versao</h3>
        <p>77Gira v1.0.0</p>
      </article>

      <p><Link to="/settings" className="btn-link">Voltar para Configuracoes</Link></p>
    </section>
  );
}

