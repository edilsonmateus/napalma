import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <section className="screen">
      <header className="page-header">
        <h2>Termos de uso</h2>
        <p>Regras para uso da plataforma 77Gira por publico, casas, produtores e administradores.</p>
      </header>

      <article className="clean-card legal-card">
        <h3>1. Aceitacao</h3>
        <p>Ao usar o 77Gira, voce concorda com estes termos, com a politica de privacidade e com as regras de conduta da plataforma.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>2. Perfis e responsabilidade</h3>
        <p><strong>Publico:</strong> usa a agenda, radar, historico e compartilhamento.</p>
        <p><strong>Casa:</strong> gerencia dados da casa e agenda da propria operacao, respeitando politicas de veracidade.</p>
        <p><strong>Produtor:</strong> gerencia carteira aprovada e operacoes autorizadas.</p>
        <p><strong>Admin:</strong> controla governanca da plataforma, aprovacoes e politicas.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>3. Conteudo e conduta</h3>
        <p>E proibido publicar informacoes falsas, ofensivas, discriminatorias, enganosas ou que violem direitos de terceiros. A plataforma pode suspender contas e remover conteudos em desacordo.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>4. Limites de responsabilidade</h3>
        <p>O 77Gira organiza informacoes de eventos, mas nao garante realizacao, lotacao, preco final, qualidade artistica, seguranca local ou disponibilidade de terceiros (apps de rota, redes sociais, etc.).</p>
      </article>

      <article className="clean-card legal-card">
        <h3>5. Alteracoes</h3>
        <p>Podemos atualizar os termos para refletir evolucao do servico, exigencias legais ou mudancas operacionais. A versao atual sera sempre publicada nesta pagina.</p>
      </article>

      <p className="meta-line legal-updated">Ultima atualizacao: 30/05/2026</p>
      <p><Link to="/settings" className="btn-link">Voltar para Configuracoes</Link></p>
    </section>
  );
}

