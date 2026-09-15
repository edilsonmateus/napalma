import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useConvertAcquisitionLeadToVenueMutation } from "../../hooks/useEventsQuery";
import { missingAcquisitionVenueFields } from "../../utils/acquisitionConversion";
import "../../styles/acquisition-conversion.css";

export default function AcquisitionConversionDialog({ lead, onClose, onConverted, theme = "admin" }) {
  const dialog = useRef(null);
  const submitting = useRef(false);
  const mutation = useConvertAcquisitionLeadToVenueMutation();
  const [state, setState] = useState("SP");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const missing = missingAcquisitionVenueFields(lead);

  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    return () => { element.close(); previous?.focus?.(); };
  }, []);

  async function confirm(event) {
    event.preventDefault();
    if (submitting.current || created || lead.status !== "closed" || lead.convertedVenueId || missing.length) return;
    submitting.current = true;
    setError("");
    try {
      const result = await mutation.mutateAsync({ id: lead.id, payload: { state, description: description.trim() || null } });
      setCreated(result.item);
      // The creation has succeeded even if refreshing another panel fails.
      try { await onConverted?.(result.item, lead.id); } catch { /* Keep the successful result visible. */ }
    } catch (failure) {
      setError(failure?.response?.data?.message || "Não foi possível criar a casa. Tente novamente.");
    } finally {
      submitting.current = false;
    }
  }

  return <dialog ref={dialog} className={`acquisition-conversion acquisition-conversion--${theme}`} aria-labelledby="acquisition-conversion-title" onCancel={(event) => { event.preventDefault(); if (!submitting.current) onClose(); }}>
    <form onSubmit={confirm}>
      <header><h2 id="acquisition-conversion-title">{created ? "Casa interna criada" : "Criar casa interna"}</h2><button type="button" onClick={onClose} disabled={mutation.isPending} aria-label="Fechar">×</button></header>
      <p><strong>{lead.venueName}</strong></p>
      {created ? <>
        <p role="status">A casa foi cadastrada e vinculada à oportunidade. Ela ainda não está publicada.</p>
        <footer><button type="button" onClick={onClose}>Concluir</button><Link to={`/settings/venues/${created.id}`} onClick={onClose}>Abrir ficha da casa</Link></footer>
      </> : <>
        <p>A casa será criada em rascunho. A publicação, o vínculo com gestores e o cadastro de eventos continuam nas suas etapas próprias.</p>
        <dl><dt>Endereço</dt><dd>{[lead.address, lead.addressNumber, lead.addressComplement].filter(Boolean).join(", ") || "Não informado"}</dd><dt>Localização</dt><dd>{[lead.neighborhood, lead.region, lead.city].filter(Boolean).join(" · ") || "Não informada"}</dd></dl>
        {missing.length > 0 ? <p role="alert">Complete {missing.join(", ")} na oportunidade antes de criar a casa.</p> : null}
        <label>Estado (UF)<input autoFocus value={state} onChange={(event) => setState(event.target.value.toUpperCase().slice(0, 2))} minLength={2} maxLength={2} pattern="[A-Z]{2}" required disabled={mutation.isPending}/></label>
        <label>Descrição inicial (opcional)<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1200} disabled={mutation.isPending} placeholder="Apresentação da casa. Este texto poderá aparecer no perfil público quando a casa for publicada."/></label>
        {error ? <p className="acquisition-conversion__error" role="alert">{error}</p> : null}
        <footer><button type="button" onClick={onClose} disabled={mutation.isPending}>Cancelar</button><button type="submit" disabled={mutation.isPending || missing.length > 0 || state.length !== 2 || lead.status !== "closed" || Boolean(lead.convertedVenueId)}>{mutation.isPending ? "Criando casa…" : "Confirmar criação da casa"}</button></footer>
      </>}
    </form>
  </dialog>;
}
