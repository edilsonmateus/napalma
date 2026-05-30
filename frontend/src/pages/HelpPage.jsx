import { Link } from "react-router-dom";

export default function HelpPage() {
  return (
    <section className="screen">
      <header className="page-header">
        <h2>Ajuda</h2>
        <p>Guia rapido por perfil para uso da plataforma.</p>
      </header>

      <article className="clean-card legal-card">
        <h3>Publico</h3>
        <ul className="legal-list">
          <li>Use Explorar para ver eventos por dia, regiao e status ao vivo.</li>
          <li>Use Meu Radar para salvar interesses e registrar presenca.</li>
          <li>Use Pela Hora para montar sequencia de roles e rotas.</li>
          <li>Use Compartilhar para enviar evento e app para amigos.</li>
        </ul>
      </article>

      <article className="clean-card legal-card">
        <h3>Casa</h3>
        <ul className="legal-list">
          <li>Atualize dados da casa, banner, endereco e operacao.</li>
          <li>Cadastre e mantenha eventos da sua agenda oficial.</li>
          <li>Gerencie produtores vinculados e solicitacoes.</li>
          <li>Acompanhe metricas basicas e status das operacoes.</li>
        </ul>
      </article>

      <article className="clean-card legal-card">
        <h3>Produtor</h3>
        <ul className="legal-list">
          <li>Solicite e acompanhe carteira de casas/artistas.</li>
          <li>Gerencie somente itens aprovados no seu escopo.</li>
          <li>Mantenha agenda e metadados com qualidade.</li>
        </ul>
      </article>

      <article className="clean-card legal-card">
        <h3>Admin</h3>
        <ul className="legal-list">
          <li>Opera governanca de casas, artistas, produtores e eventos.</li>
          <li>Controla aprovacoes, regioes e configuracoes globais.</li>
          <li>Gerencia publicidade e politicas operacionais.</li>
        </ul>
      </article>

      <article className="clean-card legal-card">
        <h3>Contato de suporte</h3>
        <p>Canal sugerido para operacao: suporte@77gira.com.br</p>
      </article>

      <p><Link to="/settings" className="btn-link">Voltar para Configuracoes</Link></p>
    </section>
  );
}

