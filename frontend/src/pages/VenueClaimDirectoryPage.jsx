import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, Plus, Search } from "lucide-react";
import BackLink from "../components/common/BackLink";
import { useCreateClaimMutation, useMyClaimsQuery, useVenuesQuery } from "../hooks/useEventsQuery";
import useClaimLegalAcknowledgement from "../hooks/useClaimLegalAcknowledgement";
import { claimIsActive } from "../utils/claimStatus";

const initialForm = {
  requestType: "ownership",
  responsibleName: "",
  responsiblePhone: "",
  claimantDocument: "",
  relationshipRole: "",
  justification: ""
};

const initialInclusionForm = {
  venueName: "",
  address: "",
  neighborhood: "",
  region: "",
  city: "São Paulo",
  state: "SP",
  instagramUrl: "",
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
  const [showInclusion, setShowInclusion] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [inclusionForm, setInclusionForm] = useState(initialInclusionForm);
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
  const activeClaimsByVenue = useMemo(() => {
    const claimsByVenue = new Map();

    for (const claim of claimsQuery.data || []) {
      if (claim.targetType !== "venue" || !claim.venue?.id || !claimIsActive(claim)) continue;

      const currentClaim = claimsByVenue.get(claim.venue.id);
      const claimCreatedAt = new Date(claim.createdAt || 0).getTime();
      const currentCreatedAt = new Date(currentClaim?.createdAt || 0).getTime();

      if (!currentClaim || claimCreatedAt > currentCreatedAt) {
        claimsByVenue.set(claim.venue.id, claim);
      }
    }

    return claimsByVenue;
  }, [claimsQuery.data]);
  const activeInclusionClaims = useMemo(() => (claimsQuery.data || [])
    .filter((claim) => claim.targetType === "venue" && claim.requestType === "venue_inclusion" && claimIsActive(claim)), [claimsQuery.data]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateInclusionField(event) {
    const { name, value } = event.target;
    setInclusionForm((current) => ({
      ...current,
      [name]: name === "state" ? value.toUpperCase().slice(0, 2) : value
    }));
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


  async function submitInclusion(event) {
    event.preventDefault();
    const legalAcknowledgement = await requestAcknowledgement();
    if (!legalAcknowledgement) return;
    setMessage("");
    try {
      const claim = await createClaim.mutateAsync({
        targetType: "venue",
        requestType: "venue_inclusion",
        responsibleName: inclusionForm.responsibleName,
        responsiblePhone: inclusionForm.responsiblePhone,
        claimantDocument: inclusionForm.claimantDocument,
        relationshipRole: inclusionForm.relationshipRole,
        justification: inclusionForm.justification,
        requestedChanges: {
          venueName: inclusionForm.venueName,
          address: inclusionForm.address,
          neighborhood: inclusionForm.neighborhood,
          region: inclusionForm.region,
          city: inclusionForm.city,
          state: inclusionForm.state,
          instagramUrl: inclusionForm.instagramUrl || undefined,
          requestedAccessProfile: requestedProfile
        },
        legalAcknowledgement
      });
      setShowInclusion(false);
      setInclusionForm(initialInclusionForm);
      setMessage(`Solicitação enviada com o protocolo RA-${claim.id.slice(0, 8).toUpperCase()}. A casa não foi publicada nem o acesso liberado: a equipe 77Gira fará a conferência primeiro.`);
    } catch (error) {
      if (error?.message === "legal_acceptance_cancelled") return;
      setMessage(error?.response?.data?.message || "Não foi possível solicitar a inclusão da casa.");
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
    {!venuesQuery.isLoading && !filtered.length ? <div className="clean-card artist-directory-empty"><strong>Casa não encontrada</strong><p>Confira a busca e, se o estabelecimento realmente não estiver cadastrado, use a solicitação de inclusão abaixo.</p></div> : null}
    <div className="artist-directory-list venue-claim-list">
      {filtered.map((venue) => {
        const activeClaim = activeClaimsByVenue.get(venue.id);
        const pending = Boolean(activeClaim);
        const pendingLabel = activeClaim?.status === "pending_legal_acceptance" ? "Aguardando assinatura" : "Em análise";
        return <article className="artist-directory-row" key={venue.id}>
          <div className="artist-directory-avatar venue-claim-avatar">{venue.images?.thumbnail || venue.thumbnailImageUrl || venue.imageUrl ? <img src={venue.images?.thumbnail || venue.thumbnailImageUrl || venue.imageUrl} srcSet={venue.images?.thumbnailSmall && venue.images?.thumbnail ? `${venue.images.thumbnailSmall} 256w, ${venue.images.thumbnail} 640w` : undefined} sizes="48px" alt="" loading="lazy"/> : <Building2 size={18}/>}</div>
          <div className="artist-directory-identity"><strong>{venue.name}</strong><small>{[venue.neighborhood, venue.region, venue.city].filter(Boolean).join(" · ") || "Casa cadastrada"}</small></div>
          <button className="artist-directory-action" type="button" disabled={pending} onClick={() => { setSelectedVenue(venue); setMessage(""); }}>{pending ? pendingLabel : "Solicitar acesso"}</button>
        </article>;
      })}
    </div>
    <section className="clean-card venue-inclusion-entry">
      <span><strong>Não encontrou a casa?</strong><small>Envie os dados para conferência. A equipe poderá vincular sua solicitação a uma casa já existente ou criar um novo rascunho interno, sem publicação automática.</small></span>
      <button className="chip" type="button" onClick={() => { setShowInclusion(true); setMessage(""); }}><Plus size={15}/>Solicitar inclusão de casa</button>
    </section>
    {activeInclusionClaims.length ? <section className="clean-card venue-inclusion-pending" aria-label="Solicitações de inclusão em andamento">
      <strong>Inclusões em andamento</strong>
      {activeInclusionClaims.map((claim) => <div key={claim.id}><span>{claim.requestedChanges?.venueName || "Casa em inclusão"}</span><small>{claim.status === "pending_legal_acceptance" ? "Aguardando sua assinatura" : "Em análise pela equipe"} · RA-{claim.id.slice(0, 8).toUpperCase()}</small></div>)}
    </section> : null}
    {selectedVenue ? <div className="modal-backdrop claim-form-backdrop"><form className="modal-card claim-form venue-claim-form" onSubmit={submitClaim}>
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
    {showInclusion ? <div className="modal-backdrop claim-form-backdrop"><form className="modal-card claim-form venue-inclusion-form" onSubmit={submitInclusion}>
      <h3>Solicitar inclusão de casa</h3>
      <p>Preencha os dados do estabelecimento. Este pedido não publica a casa e não concede acesso: a equipe 77Gira verificará duplicidade, legitimidade e cadastro antes de encaminhar a assinatura.</p>
      <label>Nome de exibição da casa<span>Ex.: Tarana Casa de Samba. Use o nome pelo qual o público encontra o local.</span><input required minLength={3} maxLength={160} name="venueName" value={inclusionForm.venueName} onChange={updateInclusionField}/></label>
      <label>Endereço completo<span>Inclua rua, número e complemento, quando houver.</span><input required minLength={5} maxLength={255} name="address" value={inclusionForm.address} onChange={updateInclusionField}/></label>
      <div className="venue-inclusion-form-grid">
        <label>Bairro<input required minLength={2} name="neighborhood" value={inclusionForm.neighborhood} onChange={updateInclusionField}/></label>
        <label>Região<span>Ex.: Centro, Zona Norte.</span><input required minLength={2} name="region" value={inclusionForm.region} onChange={updateInclusionField}/></label>
        <label>Cidade<input required minLength={2} name="city" value={inclusionForm.city} onChange={updateInclusionField}/></label>
        <label>UF<input required minLength={2} maxLength={2} name="state" value={inclusionForm.state} onChange={updateInclusionField}/></label>
      </div>
      <label>Instagram oficial (opcional)<span>Informe a URL completa do perfil oficial.</span><input type="url" name="instagramUrl" placeholder="https://instagram.com/casa" value={inclusionForm.instagramUrl} onChange={updateInclusionField}/></label>
      <label>Nome do responsável<input required minLength={3} name="responsibleName" value={inclusionForm.responsibleName} onChange={updateInclusionField}/></label>
      <label>Telefone ou WhatsApp<input required minLength={8} name="responsiblePhone" value={inclusionForm.responsiblePhone} onChange={updateInclusionField}/></label>
      <label>CPF ou CNPJ do solicitante<input required minLength={5} name="claimantDocument" value={inclusionForm.claimantDocument} onChange={updateInclusionField}/></label>
      <label>Função ou relação com a casa<input required minLength={3} name="relationshipRole" placeholder={isProducer ? "Ex.: produtor responsável" : "Ex.: proprietário, sócio, gerente"} value={inclusionForm.relationshipRole} onChange={updateInclusionField}/></label>
      <label>Como podemos confirmar o vínculo?<textarea required minLength={5} maxLength={500} name="justification" value={inclusionForm.justification} onChange={updateInclusionField}/></label>
      <div className="form-actions-inline"><button className="btn-primary" disabled={createClaim.isPending}>{createClaim.isPending ? "Enviando..." : "Enviar para conferência"}</button><button className="chip" type="button" onClick={() => setShowInclusion(false)}>Cancelar</button></div>
    </form></div> : null}
  </section>;
}
