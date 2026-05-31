import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <section className="screen">
      <header className="page-header">
        <h2>Termos de uso</h2>
        <p>Regras para uso da plataforma 77Gira por público, casas, produtores e administradores.</p>
      </header>

      <article className="clean-card legal-card">
        <h3>1. Aceitação</h3>
        <p>Ao usar o 77Gira, você concorda com estes termos, com a política de privacidade e com as regras de conduta da plataforma.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>2. Perfis e responsabilidade</h3>
        <p><strong>Público:</strong> usa a agenda, radar, histórico e compartilhamento.</p>
        <p><strong>Casa:</strong> gerencia dados da casa e agenda da própria operação, respeitando políticas de veracidade.</p>
        <p><strong>Produtor:</strong> gerencia carteira aprovada e operacoes autorizadas.</p>
        <p><strong>Admin:</strong> controla governança da plataforma, aprovações e políticas.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>3. Conteúdo e conduta</h3>
        <p>É proibido publicar informações falsas, ofensivas, discriminatórias, enganosas ou que violem direitos de terceiros. A plataforma pode suspender contas e remover conteúdos em desacordo.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>4. Limites de responsabilidade</h3>
        <p>O 77Gira organiza informações de eventos, mas não garante realização, lotação, preço final, qualidade artística, segurança local ou disponibilidade de terceiros (apps de rota, redes sociais, etc.).</p>
      </article>

      <article className="clean-card legal-card">
        <h3>5. Alterações</h3>
        <p>Podemos atualizar os termos para refletir evolução do serviço, exigências legais ou mudanças operacionais. A versão atual será sempre publicada nesta página.</p>
      </article>

      <p className="meta-line legal-updated">Última atualização: 30/05/2026</p>
      <p><Link to="/settings" className="btn-link">Voltar para Configurações</Link></p>
    </section>
  );
}
