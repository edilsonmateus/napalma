import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, Search } from "lucide-react";
import BackLink from "../components/common/BackLink";
import { useCreateClaimMutation, useMyClaimsQuery, useVenuesQuery } from "../hooks/useEventsQuery";
import useClaimLegalAcknowledgement from "../hooks/useClaimLegalAcknowledgement";

const initialForm = {
  requestType: "ownership",
  responsibleName: "",
  responsiblePhone: "",
  claimantDocument: "",
  relationshipRole: "",
  justification: ""
};

export default function VenueClaimDirectoryPage() {
  const [searchParams] = useSearchParams();
  const requestedProfile = searchParams.get("perfil") === "produtor" ? "producer" : "venue_manager";
  const isProducer = requestedProfile === "producer";
  const [query, setQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const venuesQuery = useVenuesQuery({ scope: "public" });
  const claimsQuery = useMyClaimsQuery(true);
  const createClaim = useCreateClaimMutation();
  const { requestAcknowledgement, claimLegalModal } = useClaimLegalAcknowledgement();

  const venues = Array.isArray(venuesQuery.data) ? venuesQuery.data : [];
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return venues.filter((venue) => !term || [venue.name, venue.neighborhood, venue.region, venue.city]
      .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(term));
  }, [query, venues]);
  const activeClaimsByVenue = useMemo(() => new Map((claimsQuery.data || [])
    .filter((claim) => claim.targetType === "venue" && ["pending", "pending_legal_acceptance"].includes(claim.status) && claim.venue?.id)
    .map((claim) => [claim.venue.id, claim])), [claimsQuery.data]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitClaim(event) {
    event.preventDefault();
    const legalAcknowledgement = await requestAcknowledgement();
    if (!legalAcknowledgement) return;
    setMessage("");
    try {
      await createClaim.mutateAsync({
        targetType: "venue",
        venueId: selectedVenue.id,
        requestType: form.requestType,
        responsibleName: form.responsibleName,
        responsiblePhone: form.responsiblePhone,
        claimantDocument: form.claimantDocument,
        relationshipRole: form.relationshipRole,
        justification: form.justification,
        requestedChanges: { requestedAccessProfile: requestedProfile },
        legalAcknowledgement
      });
      setSelectedVenue(null);
      setForm(initialForm);
      setMessage("Solicitação enviada. Se o vínculo for aprovado, você receberá o documento formal para leitura e assinatura. O acesso só será liberado depois da conclusão desse aceite.");
    } catch (error) {
      if (error?.message === "legal_acceptance_cancelled") return;
      setMessage(error?.response?.data?.message || "Não foi possível enviar a solicitação.");
    }
  }

  return <section className="screen artist-directory-screen venue-claim-screen">
    {claimLegalModal}
    <BackLink to="/settings/account">Voltar para Conta e preferências</BackLink>
    <header className="page-header">
      <h2>{isProducer ? "Vincule sua produção a uma casa" : "Encontre a casa que você administra"}</h2>
      <p>{isProducer
        ? "O vínculo de produção é analisado antes de liberar ferramentas da casa."
        : "Sua conta continua comum até a equipe confirmar sua relação com o estabelecimento."}</p>
    </header>
    <div className="clean-card venue-claim-security-note">
      <Building2 size={18}/><span><strong>Acesso protegido</strong><small>Nenhuma solicitação concede permissão automática ou acesso anônimo.</small></span>
    </div>
    <label className="artist-directory-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar casa, bairro, região ou cidade"/></label>
    {message ? <p className="clean-card artist-directory-message" role="status">{message}</p> : null}
    {venuesQuery.isLoading ? <p className="empty">Carregando casas...</p> : null}
    {venuesQuery.isError ? <p className="clean-card artist-directory-message">Não foi possível carregar as casas. Tente novamente.</p> : null}
    {!venuesQuery.isLoading && !filtered.length ? <div className="clean-card artist-directory-empty"><strong>Casa não encontrada</strong><p>Antes de pedir acesso, solicite a inclusão do estabelecimento à equipe 77Gira para evitarmos duplicidades.</p><a className="chip" href="mailto:77giramundo@gmail.com?subject=Solicitação de inclusão de casa">Solicitar inclusão</a></div> : null}
    <div className="artist-directory-list venue-claim-list">
      {filtered.map((venue) => {
        const activeClaim = activeClaimsByVenue.get(venue.id);
        const pending = Boolean(activeClaim);
        const pendingLabel = activeClaim?.status === "pending_legal_acceptance" ? "Aguardando assinatura" : "Em análise";
        return <article className="artist-directory-row" key={venue.id}>
          <div className="artist-directory-avatar venue-claim-avatar">{venue.imageUrl ? <img src={venue.imageUrl} alt="" loading="lazy"/> : <Building2 size={18}/>}</div>
          <div className="artist-directory-identity"><strong>{venue.name}</strong><small>{[venue.neighborhood, venue.region, venue.city].filter(Boolean).join(" · ") || "Casa cadastrada"}</small></div>
          <button className="artist-directory-action" type="button" disabled={pending} onClick={() => { setSelectedVenue(venue); setMessage(""); }}>{pending ? pendingLabel : "Solicitar acesso"}</button>
        </article>;
      })}
    </div>
    {selectedVenue ? <div className="modal-backdrop"><form className="modal-card venue-claim-form" onSubmit={submitClaim}>
      <h3>Solicitar acesso a {selectedVenue.name}</h3>
      <p>Informe dados verdadeiros. A equipe poderá pedir documentos antes de decidir.</p>
      <label>Tipo de vínculo<select name="requestType" value={form.requestType} onChange={updateField}><option value="ownership">Proprietário ou representante legal</option><option value="team_access">Equipe autorizada</option></select></label>
      <label>Nome do responsável<input required minLength={3} name="responsibleName" value={form.responsibleName} onChange={updateField}/></label>
      <label>Telefone ou WhatsApp<input required minLength={8} name="responsiblePhone" value={form.responsiblePhone} onChange={updateField}/></label>
      <label>CPF ou CNPJ do solicitante<input required minLength={5} name="claimantDocument" value={form.claimantDocument} onChange={updateField}/></label>
      <label>Função ou relação com a casa<input required minLength={3} name="relationshipRole" placeholder={isProducer ? "Ex.: produtor responsável" : "Ex.: proprietário, sócio, gerente"} value={form.relationshipRole} onChange={updateField}/></label>
      <label>Como podemos confirmar o vínculo?<textarea required minLength={5} maxLength={500} name="justification" value={form.justification} onChange={updateField}/></label>
      <div className="form-actions-inline"><button className="btn-primary" disabled={createClaim.isPending}>{createClaim.isPending ? "Enviando..." : "Enviar para análise"}</button><button className="chip" type="button" onClick={() => setSelectedVenue(null)}>Cancelar</button></div>
    </form></div> : null}
  </section>;
}
