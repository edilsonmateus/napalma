import { ArrowRight, Handshake, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function PartnerInstitutionalPage() {
  return <main className="partner-institutional-page">
    <section className="partner-institutional-shell">
      <span className="partner-institutional-eyebrow"><Handshake size={16}/> 77GIRA · PARCERIAS</span>
      <h1>Parcerias que ajudam a cena a girar.</h1>
      <p>O 77Gira conecta pessoas, casas, artistas e iniciativas que respeitam o samba e a vida cultural das cidades.</p>
      <div className="partner-institutional-notice"><ShieldCheck size={18}/><p>Esta é uma conversa institucional. O envio de uma proposta não cria vínculo comercial, não garante publicação e passa por avaliação da equipe 77Gira.</p></div>
      <div className="partner-institutional-actions"><Link to="/signup" className="partner-institutional-primary">Criar conta para conversar <ArrowRight size={16}/></Link><Link to="/anunciar" className="partner-institutional-secondary">Conhecer publicidade</Link></div>
      <small>Para assuntos institucionais, também é possível escrever para 77giramundo@gmail.com.</small>
    </section>
  </main>;
}
