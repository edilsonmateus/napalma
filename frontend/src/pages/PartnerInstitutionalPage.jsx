import { ArrowRight, Building2, Handshake, Mail, MapPinned, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const possibilities = [
  {
    icon: MapPinned,
    title: "Operação e mobilidade",
    text: "Rotas, mapas e pontos de apoio que tornam a chegada ao samba mais simples e segura.",
  },
  {
    icon: Sparkles,
    title: "Projetos e ativações",
    text: "Experiências culturais, conteúdo contextual e benefícios que respeitam o momento de quem está na cena.",
  },
  {
    icon: Building2,
    title: "Iniciativas institucionais",
    text: "Ações de cidade, cultura e comunidade com presença útil — não uma interrupção genérica.",
  },
];

export default function PartnerInstitutionalPage() {
  return <main className="partner-institutional-page">
    <article className="partner-institutional-shell">
      <header className="partner-institutional-hero">
        <span className="partner-institutional-eyebrow"><Handshake size={16} />77GIRA · PARCERIAS</span>
        <h1>Parcerias que ajudam a cena a girar.</h1>
        <p>O 77Gira conecta pessoas, casas, artistas e iniciativas que respeitam o samba e a vida cultural das cidades.</p>
      </header>

      <section className="partner-institutional-intro" aria-labelledby="partner-context-title">
        <h2 id="partner-context-title">A cena já existe. O nosso papel é aproximar.</h2>
        <p>O 77Gira organiza a descoberta de eventos de samba a partir de quem faz a cidade girar: público, casas, artistas e produtores. Parcerias entram para ampliar acesso, informação e experiência — sempre com contexto.</p>
      </section>

      <section className="partner-institutional-section" aria-labelledby="partner-possibilities-title">
        <span className="partner-institutional-section-label">POSSIBILIDADES DE PARCERIA</span>
        <h2 id="partner-possibilities-title">Onde uma parceria pode gerar valor.</h2>
        <div className="partner-institutional-grid">
          {possibilities.map(({ icon: Icon, title, text }) => <div className="partner-institutional-card" key={title}>
            <Icon size={19} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </div>)}
        </div>
      </section>

      <section className="partner-institutional-section partner-institutional-deliveries" aria-labelledby="partner-deliveries-title">
        <span className="partner-institutional-section-label">ENTREGAS POSSÍVEIS</span>
        <h2 id="partner-deliveries-title">Presença útil, desenhada para cada contexto.</h2>
        <ul>
          <li>Roteiros e mapas para descobrir, planejar e chegar aos eventos.</li>
          <li>Conteúdo e ativações ligadas a casas, artistas, territórios e datas reais.</li>
          <li>Benefícios e experiências que façam sentido para a comunidade.</li>
          <li>Apoio identificado de marca, sem alterar a curadoria ou a ordem da agenda.</li>
        </ul>
      </section>

      <section className="partner-institutional-principles" aria-labelledby="partner-principles-title">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <span className="partner-institutional-section-label">PRINCÍPIOS NÃO NEGOCIÁVEIS</span>
          <h2 id="partner-principles-title">Parceria fortalece a experiência; não compra a curadoria.</h2>
          <p>A agenda e a descoberta de eventos permanecem independentes. O 77Gira não promove publicidade de apostas ou bets e seleciona parceiros por transparência, respeito à comunidade e contribuição real para a cultura.</p>
        </div>
      </section>

      <section className="partner-institutional-contact" aria-labelledby="partner-contact-title">
        <div>
          <span className="partner-institutional-section-label">VAMOS CONVERSAR</span>
          <h2 id="partner-contact-title">Uma conversa institucional começa sem burocracia.</h2>
          <p>Você não precisa criar uma conta para apresentar uma proposta. Se houver aderência, a equipe 77Gira orientará os próximos passos e a formalização necessária.</p>
        </div>
        <div className="partner-institutional-actions">
          <a className="partner-institutional-primary" href="mailto:77giramundo@gmail.com?subject=Proposta%20de%20parceria%20-%2077Gira">Enviar proposta por e-mail <Mail size={16} /></a>
          <Link to="/parceiros" className="partner-institutional-secondary">Conhecer parceiros <ArrowRight size={16} /></Link>
        </div>
      </section>
    </article>
  </main>;
}
