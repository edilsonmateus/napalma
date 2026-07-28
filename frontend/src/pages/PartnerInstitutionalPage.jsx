import { ArrowRight, Handshake, Mail, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function PartnerInstitutionalPage() {
  return <main className="partner-institutional-page">
    <section className="partner-institutional-shell">
      <span className="partner-institutional-eyebrow"><Handshake size={16}/> 77GIRA · PARCERIAS</span>
      <h1>Parcerias que ajudam a cena a girar.</h1>
      <p>O 77Gira conecta pessoas, casas, artistas e iniciativas que respeitam o samba e a vida cultural das cidades.</p>
      <div className="partner-institutional-notice"><ShieldCheck size={18}/><p>Esta é uma conversa institucional. O envio de uma proposta não cria vínculo comercial, não garante publicação e passa por avaliação da equipe 77Gira.</p></div>
      <div className="partner-institutional-actions">
        <a className="partner-institutional-primary" href="mailto:77giramundo@gmail.com?subject=Proposta%20de%20parceria%20-%2077Gira">Enviar proposta por e-mail <Mail size={16}/></a>
        <Link to="/parceiros" className="partner-institutional-secondary">Conhecer parceiros <ArrowRight size={16}/></Link>
      </div>
      <small>Você não precisa criar uma conta para apresentar uma proposta. Se a conversa avançar para uma operação formal, a equipe orientará os próximos passos.</small>
    </section>
  </main>;
}
