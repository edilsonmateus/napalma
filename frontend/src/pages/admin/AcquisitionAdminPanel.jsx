import { useMemo, useState } from "react";
import {
  useAcquisitionLeadsQuery,
  useCreateAcquisitionInteractionMutation,
  useCreateAcquisitionLeadMutation,
  useDeleteAcquisitionLeadMutation,
  useUpdateAcquisitionLeadMutation
} from "../../hooks/useEventsQuery";

const statusOptions = [
  { value: "mapped", label: "Mapeada" },
  { value: "contact_started", label: "Contato iniciado" },
  { value: "in_conversation", label: "Conversa em andamento" },
  { value: "presentation_scheduled", label: "Apresentação marcada" },
  { value: "proposal_sent", label: "Proposta enviada" },
  { value: "negotiating", label: "Em negociação" },
  { value: "closed", label: "Fechada" },
  { value: "lost", label: "Perdida" },
  { value: "follow_up_later", label: "Retomar depois" }
];

const temperatureOptions = [
  { value: "cold", label: "Fria" },
  { value: "warm", label: "Morna" },
  { value: "hot", label: "Quente" }
];

const interactionTypes = [
  { value: "note", label: "Nota" },
  { value: "call", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meeting", label: "Reunião" },
  { value: "proposal", label: "Proposta" },
  { value: "email", label: "E-mail" }
];

const initialLeadForm = {
  venueName: "",
  city: "São Paulo",
  region: "",
  neighborhood: "",
  instagramUrl: "",
  phone: "",
  contactName: "",
  contactRole: "",
  email: "",
  status: "mapped",
  temperature: "warm",
  nextFollowUpAt: "",
  presentationAt: "",
  presentationFormat: "",
  source: "",
  potential: "",
  objections: "",
  notes: ""
};

const initialInteractionForm = {
  type: "note",
  summary: "",
  nextAction: "",
  nextFollowUpAt: ""
};

const statusLabelMap = Object.fromEntries(statusOptions.map((item) => [item.value, item.label]));
const temperatureLabelMap = Object.fromEntries(temperatureOptions.map((item) => [item.value, item.label]));

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDateTime(value) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isOverdue(value, status) {
  if (!value || ["closed", "lost"].includes(status)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function buildPayload(form) {
  return {
    ...form,
    nextFollowUpAt: toIsoOrNull(form.nextFollowUpAt),
    presentationAt: toIsoOrNull(form.presentationAt)
  };
}

export default function AcquisitionAdminPanel({ onToast }) {
  const [filters, setFilters] = useState({ q: "", status: "all", temperature: "all", followUp: "all" });
  const [leadForm, setLeadForm] = useState(initialLeadForm);
  const [editingLeadId, setEditingLeadId] = useState("");
  const [interactionLeadId, setInteractionLeadId] = useState("");
  const [interactionForm, setInteractionForm] = useState(initialInteractionForm);

  const queryParams = useMemo(
    () => ({
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.status !== "all" ? { status: filters.status } : {}),
      ...(filters.temperature !== "all" ? { temperature: filters.temperature } : {}),
      ...(filters.followUp !== "all" ? { followUp: filters.followUp } : {})
    }),
    [filters]
  );

  const { data, isLoading } = useAcquisitionLeadsQuery(queryParams);
  const createLead = useCreateAcquisitionLeadMutation();
  const updateLead = useUpdateAcquisitionLeadMutation();
  const deleteLead = useDeleteAcquisitionLeadMutation();
  const createInteraction = useCreateAcquisitionInteractionMutation();

  const leads = data?.items || [];
  const summary = data?.summary || {};

  function handleLeadChange(event) {
    const { name, value } = event.target;
    setLeadForm((current) => ({ ...current, [name]: value }));
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetLeadForm() {
    setLeadForm(initialLeadForm);
    setEditingLeadId("");
  }

  async function handleLeadSubmit(event) {
    event.preventDefault();
    try {
      const payload = buildPayload(leadForm);
      if (editingLeadId) {
        await updateLead.mutateAsync({ id: editingLeadId, payload });
        onToast?.("Oportunidade atualizada.");
      } else {
        await createLead.mutateAsync(payload);
        onToast?.("Oportunidade cadastrada.");
      }
      resetLeadForm();
    } catch (error) {
      onToast?.(error?.response?.data?.message || "Não foi possível salvar a oportunidade.", "error");
    }
  }

  function handleEditLead(lead) {
    setEditingLeadId(lead.id);
    setLeadForm({
      venueName: lead.venueName || "",
      city: lead.city || "São Paulo",
      region: lead.region || "",
      neighborhood: lead.neighborhood || "",
      instagramUrl: lead.instagramUrl || "",
      phone: lead.phone || "",
      contactName: lead.contactName || "",
      contactRole: lead.contactRole || "",
      email: lead.email || "",
      status: lead.status || "mapped",
      temperature: lead.temperature || "warm",
      nextFollowUpAt: toDateInputValue(lead.nextFollowUpAt),
      presentationAt: toDateInputValue(lead.presentationAt),
      presentationFormat: lead.presentationFormat || "",
      source: lead.source || "",
      potential: lead.potential || "",
      objections: lead.objections || "",
      notes: lead.notes || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteLead(leadId) {
    if (!window.confirm("Excluir esta oportunidade de aquisição?")) return;
    try {
      await deleteLead.mutateAsync(leadId);
      onToast?.("Oportunidade removida.");
    } catch (error) {
      onToast?.(error?.response?.data?.message || "Não foi possível remover a oportunidade.", "error");
    }
  }

  function handleInteractionChange(event) {
    const { name, value } = event.target;
    setInteractionForm((current) => ({ ...current, [name]: value }));
  }

  async function handleInteractionSubmit(event) {
    event.preventDefault();
    if (!interactionLeadId) return;
    try {
      await createInteraction.mutateAsync({
        leadId: interactionLeadId,
        payload: {
          ...interactionForm,
          nextFollowUpAt: toIsoOrNull(interactionForm.nextFollowUpAt)
        }
      });
      setInteractionLeadId("");
      setInteractionForm(initialInteractionForm);
      onToast?.("Contato registrado.");
    } catch (error) {
      onToast?.(error?.response?.data?.message || "Não foi possível registrar o contato.", "error");
    }
  }

  return (
    <section className="acquisition-panel">
      <div className="admin-kpis acquisition-kpis">
        <article className="clean-card"><h4>Total mapeado</h4><p>{summary.total ?? 0}</p></article>
        <article className="clean-card"><h4>Em andamento</h4><p>{summary.active ?? 0}</p></article>
        <article className="clean-card"><h4>Apresentações</h4><p>{summary.presentations ?? 0}</p></article>
        <article className="clean-card"><h4>Propostas</h4><p>{summary.proposals ?? 0}</p></article>
        <article className="clean-card"><h4>Fechadas</h4><p>{summary.closed ?? 0}</p></article>
        <article className="clean-card acquisition-alert-kpi"><h4>Follow-ups vencidos</h4><p>{summary.overdue ?? 0}</p></article>
      </div>

      <div className="admin-content-divider" />

      <div className="acquisition-grid">
        <form className="venue-form acquisition-form" onSubmit={handleLeadSubmit}>
          <h3>{editingLeadId ? "Editar oportunidade" : "Nova oportunidade"}</h3>
          <p className="meta-line">Use este bloco para organizar contato comercial com casas ainda fora da carteira.</p>
          <input name="venueName" value={leadForm.venueName} onChange={handleLeadChange} placeholder="Nome da casa" required />
          <div className="form-actions-inline">
            <input name="city" value={leadForm.city} onChange={handleLeadChange} placeholder="Cidade" />
            <input name="region" value={leadForm.region} onChange={handleLeadChange} placeholder="Região" />
          </div>
          <div className="form-actions-inline">
            <input name="neighborhood" value={leadForm.neighborhood} onChange={handleLeadChange} placeholder="Bairro" />
            <input name="instagramUrl" value={leadForm.instagramUrl} onChange={handleLeadChange} placeholder="Instagram" />
          </div>
          <div className="form-actions-inline">
            <input name="contactName" value={leadForm.contactName} onChange={handleLeadChange} placeholder="Nome do contato" />
            <input name="contactRole" value={leadForm.contactRole} onChange={handleLeadChange} placeholder="Função do contato" />
          </div>
          <div className="form-actions-inline">
            <input name="phone" value={leadForm.phone} onChange={handleLeadChange} placeholder="Telefone / WhatsApp" />
            <input name="email" value={leadForm.email} onChange={handleLeadChange} placeholder="E-mail" />
          </div>
          <div className="form-actions-inline">
            <select name="status" value={leadForm.status} onChange={handleLeadChange}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select name="temperature" value={leadForm.temperature} onChange={handleLeadChange}>
              {temperatureOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="form-actions-inline">
            <label className="field-with-helper">
              <span>Próximo follow-up</span>
              <input name="nextFollowUpAt" type="datetime-local" value={leadForm.nextFollowUpAt} onChange={handleLeadChange} />
              <small>Quando retomar contato com a casa.</small>
            </label>
            <label className="field-with-helper">
              <span>Data da apresentação</span>
              <input name="presentationAt" type="datetime-local" value={leadForm.presentationAt} onChange={handleLeadChange} />
              <small>Quando apresentar ou registrar a apresentação do projeto.</small>
            </label>
          </div>
          <div className="form-actions-inline">
            <input name="presentationFormat" value={leadForm.presentationFormat} onChange={handleLeadChange} placeholder="Presencial, chamada, WhatsApp..." />
            <input name="source" value={leadForm.source} onChange={handleLeadChange} placeholder="Origem do lead" />
          </div>
          <input name="potential" value={leadForm.potential} onChange={handleLeadChange} placeholder="Potencial: gold, recorrente, estratégico..." />
          <textarea name="objections" value={leadForm.objections} onChange={handleLeadChange} placeholder="Objeções, dúvidas ou travas comerciais" />
          <textarea name="notes" value={leadForm.notes} onChange={handleLeadChange} placeholder="Anotações para follow-up" />
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={createLead.isPending || updateLead.isPending}>
              {editingLeadId ? "Salvar oportunidade" : "Criar oportunidade"}
            </button>
            {editingLeadId ? <button type="button" className="chip" onClick={resetLeadForm}>Cancelar edição</button> : null}
          </div>
        </form>

        <div className="acquisition-board">
          <div className="acquisition-board-header">
            <h3>Carteira de aquisição</h3>
            <p className="meta-line">Busque, filtre e acompanhe cada negociação sem misturar com o cadastro.</p>
          </div>
          <div className="acquisition-toolbar">
            <input name="q" value={filters.q} onChange={handleFilterChange} placeholder="Buscar casa, contato, bairro ou telefone..." />
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="all">Todos os status</option>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select name="temperature" value={filters.temperature} onChange={handleFilterChange}>
              <option value="all">Todas as temperaturas</option>
              {temperatureOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select name="followUp" value={filters.followUp} onChange={handleFilterChange}>
              <option value="all">Todos os follow-ups</option>
              <option value="overdue">Vencidos</option>
            </select>
          </div>

          {isLoading ? <p className="empty">Carregando oportunidades...</p> : null}
          {!isLoading && leads.length === 0 ? <p className="empty">Nenhuma oportunidade encontrada. Cadastre a primeira casa para acompanhar a negociação.</p> : null}

          <div className="acquisition-list">
            {leads.map((lead) => {
              const overdue = isOverdue(lead.nextFollowUpAt, lead.status);
              const interactionOpen = interactionLeadId === lead.id;
              return (
                <article key={lead.id} className={`clean-card acquisition-lead-card${overdue ? " overdue" : ""}`}>
                  <div className="acquisition-lead-main">
                    <div>
                      <span className={`acquisition-temp temp-${lead.temperature}`}>{temperatureLabelMap[lead.temperature] || lead.temperature}</span>
                      <h4>{lead.venueName}</h4>
                      <p>{[lead.neighborhood, lead.region, lead.city].filter(Boolean).join(" - ") || "Local a completar"}</p>
                      <p className="meta-line">{lead.contactName || "Contato não informado"} {lead.contactRole ? `· ${lead.contactRole}` : ""}</p>
                    </div>
                    <div className="acquisition-lead-side">
                      <span className="acquisition-status">{statusLabelMap[lead.status] || lead.status}</span>
                      <span className={overdue ? "acquisition-overdue" : "meta-line"}>
                        Follow-up: {formatDateTime(lead.nextFollowUpAt)}
                      </span>
                    </div>
                  </div>

                  <div className="acquisition-contact-line">
                    {lead.phone ? <span>{lead.phone}</span> : null}
                    {lead.instagramUrl ? <span>{lead.instagramUrl}</span> : null}
                    {lead.email ? <span>{lead.email}</span> : null}
                  </div>

                  {lead.latestInteraction ? (
                    <p className="acquisition-latest">Último contato: {lead.latestInteraction.summary}</p>
                  ) : (
                    <p className="meta-line">Nenhum contato registrado ainda.</p>
                  )}

                  {lead.notes ? <p className="meta-line">{lead.notes}</p> : null}

                  {interactionOpen ? (
                    <form className="acquisition-interaction-form" onSubmit={handleInteractionSubmit}>
                      <select name="type" value={interactionForm.type} onChange={handleInteractionChange}>
                        {interactionTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <textarea name="summary" value={interactionForm.summary} onChange={handleInteractionChange} placeholder="Resumo do contato realizado" required />
                      <input name="nextAction" value={interactionForm.nextAction} onChange={handleInteractionChange} placeholder="Próxima ação combinada" />
                      <input name="nextFollowUpAt" type="datetime-local" value={interactionForm.nextFollowUpAt} onChange={handleInteractionChange} />
                      <div className="form-actions">
                        <button type="submit" className="chip" disabled={createInteraction.isPending}>Salvar contato</button>
                        <button type="button" className="chip" onClick={() => setInteractionLeadId("")}>Cancelar</button>
                      </div>
                    </form>
                  ) : null}

                  <div className="acquisition-card-actions">
                    <button type="button" className="chip" onClick={() => handleEditLead(lead)}>Editar</button>
                    <button type="button" className="chip" onClick={() => {
                      setInteractionLeadId(lead.id);
                      setInteractionForm(initialInteractionForm);
                    }}>
                      Registrar contato
                    </button>
                    <button type="button" className="chip chip-danger" onClick={() => handleDeleteLead(lead.id)} disabled={deleteLead.isPending}>
                      Excluir
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
