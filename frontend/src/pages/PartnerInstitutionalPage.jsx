import { ArrowRight, Building2, Handshake, Mail, MapPinned, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const possibilities = [
  { icon: MapPinned, title: "Roteiros e informação", text: "Roteiros de samba por bairro, dia e estilo; mapas, rotas e informações de como chegar aos eventos." },
  { icon: Sparkles, title: "Conteúdo e experiências", text: "Conteúdos sobre casas, artistas, produtores e territórios, além de benefícios e experiências para o público." },
  { icon: Building2, title: "Projetos e ativações", text: "Projetos culturais e ativações presenciais ligados à cena do samba." },
];

export default function PartnerInstitutionalPage() {
  return <main className="partner-institutional-page">
    <article className="partner-institutional-shell">
      <header className="partner-institutional-hero">
        <span className="partner-institutional-eyebrow"><Handshake size={16} />77GIRA · PARCERIAS</span>
        <h1>Parcerias com o 77 Gira</h1>
        <p className="partner-institutional-lead">Sua marca pode ajudar mais pessoas a encontrarem o samba da cidade.</p>
        <p>O 77 Gira é uma plataforma que reúne eventos de samba em São Paulo. Ajudamos o público a descobrir onde ir, encontrar informações confiáveis e chegar aos eventos; e ajudamos casas, produtores e artistas a terem sua programação mais visível.</p>
        <p>Uma parceria com o 77 Gira financia e fortalece essa experiência.</p>
      </header>

      <section className="partner-institutional-section" aria-labelledby="partner-possibilities-title">
        <span className="partner-institutional-section-label">POSSIBILIDADES</span>
        <h2 id="partner-possibilities-title">O que uma parceria pode viabilizar</h2>
        <div className="partner-institutional-grid">
          {possibilities.map(({ icon: Icon, title, text }) => <div className="partner-institutional-card" key={title}>
            <Icon size={19} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </div>)}
        </div>
      </section>

      <section className="partner-institutional-section partner-institutional-deliveries" aria-labelledby="partner-brand-title">
        <span className="partner-institutional-section-label">PRESENÇA DE MARCA</span>
        <h2 id="partner-brand-title">Como a marca aparece</h2>
        <p>A marca pode estar presente em roteiros, mapas, conteúdos ou experiências que ela ajuda a tornar possíveis.</p>
        <p>Essa presença é sempre identificada com clareza, por exemplo: “Roteiro apoiado por [Marca]”. A marca não interfere na escolha dos eventos nem na ordem da agenda.</p>
      </section>

      <section className="partner-institutional-section" aria-labelledby="partner-return-title">
        <span className="partner-institutional-section-label">RETORNO DA PARCERIA</span>
        <h2 id="partner-return-title">O que o 77 Gira oferece à marca</h2>
        <ul className="partner-institutional-list">
          <li>Associação com a cultura do samba e a vida urbana da cidade.</li>
          <li>Presença em uma plataforma que conecta público, casas e produtores.</li>
          <li>Formatos de parceria adaptados ao objetivo da marca.</li>
          <li>Possibilidade de acompanhar alcance de conteúdos, acessos a roteiros e participação em ativações.</li>
        </ul>
      </section>

      <section className="partner-institutional-principles" aria-labelledby="partner-principles-title">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <span className="partner-institutional-section-label">NOSSOS PRINCÍPIOS</span>
          <h2 id="partner-principles-title">A curadoria é independente.</h2>
          <p>O 77 Gira não aceita publicidade de apostas ou bets.</p>
          <p>Escolhemos parceiros que contribuam de forma real para a cultura, o acesso, a mobilidade, o bem-estar e o respeito à comunidade.</p>
        </div>
      </section>

      <section className="partner-institutional-contact" aria-labelledby="partner-contact-title">
        <div>
          <span className="partner-institutional-section-label">VAMOS CONVERSAR</span>
          <h2 id="partner-contact-title">Vamos conversar</h2>
          <p>Se sua marca quer apoiar a descoberta do samba e construir uma presença útil na cidade, fale com o 77 Gira.</p>
        </div>
        <div className="partner-institutional-actions">
          <a className="partner-institutional-primary" href="mailto:77giramundo@gmail.com?subject=Proposta%20de%20parceria%20-%2077Gira">Enviar proposta por e-mail <Mail size={16} /></a>
          <Link to="/parceiros" className="partner-institutional-secondary">Conhecer parceiros <ArrowRight size={16} /></Link>
        </div>
      </section>
    </article>
  </main>;
}
