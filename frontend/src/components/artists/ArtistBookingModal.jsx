import { useState } from "react";
import { createArtistBooking } from "../../services/artistBookings.service";

const EMPTY = { requesterName: "", requesterEmail: "", requesterPhone: "", desiredDate: "", city: "", neighborhood: "", eventType: "", estimatedAudience: "", budgetRange: "", message: "", companyWebsite: "" };

export default function ArtistBookingModal({ artist, onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function change(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await createArtistBooking({ ...form, artistId: artist.id, desiredDate: form.desiredDate ? new Date(form.desiredDate).toISOString() : null, estimatedAudience: form.estimatedAudience ? Number(form.estimatedAudience) : null, requesterPhone: form.requesterPhone || null, neighborhood: form.neighborhood || null, budgetRange: form.budgetRange || null });
      if (!result?.item?.id) throw new Error("A solicitação não foi registrada. Limpe o autopreenchimento do navegador e tente novamente.");
      onSuccess?.(); onClose();
    } catch (requestError) { setError(requestError?.response?.data?.message || requestError?.message || "Nao foi possivel enviar a solicitacao."); } finally { setBusy(false); }
  }
  return <div className="modal-backdrop"><form className="modal-card artist-booking-form" onSubmit={submit}><h3>Contratar {artist.name}</h3><p className="meta-line">A solicitação será entregue à equipe oficial do artista.</p>{error ? <p className="field-error">{error}</p> : null}<div className="artist-booking-honeypot" aria-hidden="true"><input type="text" tabIndex="-1" autoComplete="new-password" data-1p-ignore="true" data-lpignore="true" name="companyWebsite" value={form.companyWebsite} onChange={change}/></div><input required name="requesterName" placeholder="Seu nome ou empresa" value={form.requesterName} onChange={change}/><input required type="email" name="requesterEmail" placeholder="E-mail para retorno" value={form.requesterEmail} onChange={change}/><input name="requesterPhone" placeholder="Telefone ou WhatsApp (opcional)" value={form.requesterPhone} onChange={change}/><div className="artist-booking-pair"><label>Data desejada<input type="date" name="desiredDate" value={form.desiredDate} onChange={change}/></label><label>Público estimado<input type="number" min="1" name="estimatedAudience" value={form.estimatedAudience} onChange={change}/></label></div><input required name="city" placeholder="Cidade" value={form.city} onChange={change}/><input name="neighborhood" placeholder="Bairro ou região" value={form.neighborhood} onChange={change}/><input required name="eventType" placeholder="Tipo de evento" value={form.eventType} onChange={change}/><input name="budgetRange" placeholder="Faixa de orçamento (opcional)" value={form.budgetRange} onChange={change}/><textarea required minLength="10" rows="5" name="message" placeholder="Conte um pouco sobre o evento" value={form.message} onChange={change}/><div className="form-actions-inline"><button className="btn-primary" disabled={busy}>{busy ? "Enviando..." : "Enviar solicitação"}</button><button type="button" className="chip" onClick={onClose}>Cancelar</button></div></form></div>;
}
