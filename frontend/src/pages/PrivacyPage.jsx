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
        <p>Coletamos dados de cadastro (nome, email e senha), dados de uso (eventos vistos, radar, histórico, planos) e dados técnicos necessários para funcionamento e segurança da plataforma.</p>
        <p>Quando permitido pelo navegador, podemos usar informações de localização para melhorar filtros por praça e região.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>2. Uso dos dados</h3>
        <p>Usamos seus dados para autenticar acesso, sincronizar sua experiência entre dispositivos, personalizar exibição de eventos e manter a segurança operacional do serviço.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>3. Compartilhamento</h3>
        <p>Não vendemos dados pessoais. Podemos compartilhar dados com provedores de infraestrutura (hospedagem, banco, analytics) somente para operação da plataforma e dentro de obrigações contratuais de confidencialidade.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>4. Retenção e exclusão</h3>
        <p>Mantemos dados enquanto sua conta estiver ativa ou enquanto forem necessários para cumprimento legal e auditoria. Você pode solicitar exclusão da conta e dados pessoais pelo canal de suporte.</p>
      </article>

      <article className="clean-card legal-card">
        <h3>5. Seus direitos</h3>
        <p>Você pode solicitar acesso, correção, portabilidade e exclusão dos seus dados, conforme legislação aplicável (incluindo LGPD).</p>
      </article>

      <p className="meta-line legal-updated">Última atualização: 30/05/2026</p>
      <p><Link to="/settings" className="btn-link">Voltar para Configurações</Link></p>
    </section>
  );
}
