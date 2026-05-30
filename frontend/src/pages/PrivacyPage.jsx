import { Link } from "react-router-dom";

export default function PrivacyPage() {
  return (
    <section className="screen">
      <header className="page-header">
        <h2>Privacidade</h2>
        <p>Como coletamos, usamos e protegemos seus dados no 77Gira.</p>
      </header>

      <article className="clean-card legal-card">
        <h3>1. Dados coletados</h3>
        <p>Coletamos dados de cadastro (nome, email e senha), dados de uso (eventos vistos, radar, historico, planos), e dados tecnicos necessarios para funcionamento e seguranca da plataforma.</p>
        <p>Quando permitido pelo navegador, podemos usar informacoes de localizacao para melhorar filtros por praca e regiao.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>2. Uso dos dados</h3>
        <p>Usamos seus dados para autenticar acesso, sincronizar sua experiencia entre dispositivos, personalizar exibicao de eventos e manter a seguranca operacional do servico.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>3. Compartilhamento</h3>
        <p>Nao vendemos dados pessoais. Podemos compartilhar dados com provedores de infraestrutura (hospedagem, banco, analytics) somente para operacao da plataforma e dentro de obrigacoes contratuais de confidencialidade.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>4. Retencao e exclusao</h3>
        <p>Mantemos dados enquanto sua conta estiver ativa ou enquanto forem necessarios para cumprimento legal e auditoria. Voce pode solicitar exclusao da conta e dados pessoais pelo canal de suporte.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>5. Seus direitos</h3>
        <p>Voce pode solicitar acesso, correcao, portabilidade e exclusao dos seus dados, conforme legislacao aplicavel (incluindo LGPD).</p>
      </article>

      <p className="meta-line legal-updated">Ultima atualizacao: 30/05/2026</p>
      <p><Link to="/settings" className="btn-link">Voltar para Configuracoes</Link></p>
    </section>
  );
}

