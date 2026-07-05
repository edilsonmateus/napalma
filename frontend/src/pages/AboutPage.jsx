import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <section className="screen legal-screen">
      <header className="page-header"><h2>Sobre o 77Gira</h2><p>Todos os sambas aqui — para descobrir, organizar, fortalecer e fazer a roda girar.</p></header>

      <article className="clean-card legal-card"><h3>O que somos</h3><p>O 77Gira é uma plataforma brasileira dedicada à cultura do samba. Reunimos agenda, descoberta, perfis profissionais e ferramentas de gestão em uma experiência pensada para quem frequenta, produz, recebe, apresenta e impulsiona a cena.</p></article>

      <article className="clean-card legal-card"><h3>Nossa missão</h3><p>Diminuir a distância entre o público e a roda, dar visibilidade qualificada a artistas e casas e oferecer infraestrutura digital para uma cadeia cultural que se movimenta todos os dias.</p></article>

      <article className="clean-card legal-card"><h3>Para o público</h3><p>Uma agenda viva para encontrar o que acontece agora ou nos próximos dias, filtrar por região e horário, salvar eventos, seguir artistas, organizar rotas e compartilhar planos com os amigos.</p></article>

      <article className="clean-card legal-card"><h3>Para artistas</h3><p>Um EPK vivo e verificável, com identidade, release, agenda, fotos, vídeos, links oficiais e informações para contratantes. Equipes autorizadas também recebem oportunidades e acompanham sinais de interesse do público.</p></article>

      <article className="clean-card legal-card"><h3>Para casas e produtores</h3><p>Ferramentas para manter cadastros e programação atualizados, organizar acessos e apresentar ao público informações confiáveis sobre a operação e os eventos.</p></article>

      <article className="clean-card legal-card"><h3>Para anunciantes</h3><p>Um ambiente de campanhas conectado ao contexto cultural da plataforma, com contas, permissões, criativos, revisão e métricas de entrega — respeitando a experiência do público e a governança do produto.</p></article>

      <article className="clean-card legal-card"><h3>Como construímos</h3><p>O 77Gira combina curadoria, dados estruturados e colaboração de equipes autorizadas. Perfis verificados e fluxos de revisão ajudam a aumentar a confiança, sem substituir a confirmação final com casas, artistas e produções.</p></article>

      <article className="clean-card legal-card"><h3>Compromisso com a cena</h3><p>Tecnologia aqui é meio, não fim. Nosso trabalho é valorizar a diversidade do samba, ampliar encontros e criar ferramentas úteis sem apagar a autonomia de quem faz a cultura acontecer.</p></article>

      <article className="clean-card legal-card"><h3>Versão</h3><p>77Gira v1.0.0</p><p>Feito em casa, feito com alma. Desenhado e codificado por 77 Giramundo.</p></article>

      <p className="meta-line legal-updated">Última atualização: 05/07/2026</p>
      <p><Link to="/settings" className="btn-link">Voltar para Configurações</Link></p>
    </section>
  );
}
