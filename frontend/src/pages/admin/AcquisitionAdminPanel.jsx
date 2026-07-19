import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  useAcquisitionAnalyticsQuery,
  useAcquisitionLeadTimelineQuery,
  useAcquisitionLeadsQuery,
  useCreateAcquisitionInteractionMutation,
  useCreateAcquisitionLeadMutation,
  useDeleteAcquisitionLeadMutation,
  useUpdateAcquisitionLeadMutation
} from "../../hooks/useEventsQuery";

const territoryTileLayer = {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
};

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
  address: "",
  addressNumber: "",
  addressComplement: "",
  zipCode: "",
  coordinates: "",
  latitude: "",
  longitude: "",
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

const DEFAULT_MAP_CENTER = [-23.55052, -46.633308];

const analyticsRanges = [
  { value: 1, label: "Hoje" },
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
  { value: 120, label: "120 dias" }
];

const movementLines = [
  { key: "newLeads", label: "Novos leads", color: "#2f6fed" },
  { key: "contacts", label: "Contatos", color: "#13a87b" },
  { key: "meetings", label: "Reuniões", color: "#8b5cf6" },
  { key: "proposals", label: "Propostas", color: "#f59e0b" },
  { key: "statusChanges", label: "Mudanças de etapa", color: "#64748b" }
];

const REGION_COORDINATES = {
  centro: [-23.5452, -46.6339],
  "zona norte": [-23.5027, -46.6247],
  "zona sul": [-23.6415, -46.6994],
  "zona leste": [-23.5489, -46.5201],
  "zona oeste": [-23.5614, -46.6908],
  "grande sao paulo": [-23.5329, -46.7918],
  "sao paulo": DEFAULT_MAP_CENTER
};

function normalizeMapText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isUsableCoordinatePair(latitude, longitude) {
  if (latitude === undefined || latitude === null || latitude === "") return false;
  if (longitude === undefined || longitude === null || longitude === "") return false;

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;

  // Valores 0,0 quase sempre significam ausencia de coordenada real no cadastro.
  return !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001);
}

function getLeadCoordinates(lead, index) {
  if (isUsableCoordinatePair(lead.latitude, lead.longitude)) {
    return [Number(lead.latitude), Number(lead.longitude)];
  }

  const regionKey = normalizeMapText(lead.region);
  const cityKey = normalizeMapText(lead.city);
  const base = REGION_COORDINATES[regionKey] || REGION_COORDINATES[cityKey] || DEFAULT_MAP_CENTER;
  const row = Math.floor(index / 7) % 7;
  const col = index % 7;
  return [
    base[0] + (row - 3) * 0.004,
    base[1] + (col - 3) * 0.004
  ];
}

function getLeadPinKind(lead) {
  if (lead.status === "closed") return "closed";
  if (lead.status === "lost") return "lost";
  if (lead.temperature === "hot") return "hot";
  if (lead.temperature === "cold") return "cold";
  return "warm";
}

const LEAD_PIN_COLORS = {
  hot: "#ff4242",
  warm: "#ffad38",
  cold: "#33bfff",
  closed: "#22e28a",
  lost: "#6d7780"
};

function getLeadMarkerStyle(lead) {
  const kind = getLeadPinKind(lead);
  const color = LEAD_PIN_COLORS[kind] || LEAD_PIN_COLORS.warm;
  return {
    color: "rgba(247, 251, 255, 0.96)",
    fillColor: color,
    fillOpacity: 0.95,
    opacity: 0.95,
    weight: 3,
    dashArray: ""
  };
}

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

function toFloatOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCoordinatePair(value) {
  if (!value) return null;
  const parts = String(value)
    .trim()
    .split(",")
    .map((part) => part.trim());

  if (parts.length !== 2) return null;

  const latitude = Number(parts[0]);
  const longitude = Number(parts[1]);
  if (!isUsableCoordinatePair(latitude, longitude)) return null;

  return { latitude, longitude };
}

function formatCoordinatePair(latitude, longitude) {
  if (!isUsableCoordinatePair(latitude, longitude)) return "";
  return `${latitude}, ${longitude}`;
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

function formatChartDate(value) {
  const [year, month, day] = String(value || "").split("-");
  return year && month && day ? `${day}/${month}` : value;
}

function formatHours(value) {
  if (value === null || value === undefined) return "Sem base";
  if (value < 24) return `${Math.round(value)}h`;
  return `${(value / 24).toFixed(1).replace(".", ",")} dias`;
}

function actorName(actor) {
  if (!actor) return "Sistema";
  return [actor.firstName, actor.lastName].filter(Boolean).join(" ") || "Equipe 77Gira";
}

function timelineTitle(item) {
  if (item.kind === "status_changed") {
    return `${statusLabelMap[item.fromStatus] || item.fromStatus || "Início"} → ${statusLabelMap[item.toStatus] || item.toStatus}`;
  }
  if (item.kind === "interaction") {
    const type = interactionTypes.find((option) => option.value === item.interactionType)?.label;
    return type ? `${type}: ${item.title}` : item.title;
  }
  return item.title;
}

function AcquisitionIntelligence({ filters, onFilterChange }) {
  const { data, isLoading, isError } = useAcquisitionAnalyticsQuery(filters);
  const totals = data?.totals || {};
  const statusDistribution = data?.statusDistribution || [];
  const maxStatusCount = Math.max(1, ...statusDistribution.map((item) => item.count));

  return (
    <section className="clean-card acquisition-intelligence">
      <div className="acquisition-intelligence-header">
        <div>
          <span className="acquisition-eyebrow">INTELIGÊNCIA DE AQUISIÇÃO</span>
          <h3>Pulso comercial</h3>
          <p>Volume, cadência e intervalos que exigem ação.</p>
        </div>
        <div className="acquisition-analytics-filters">
          <label>
            <span>Período</span>
            <select name="days" value={filters.days} onChange={onFilterChange}>
              {analyticsRanges.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>
            <span>Etapa</span>
            <select name="status" value={filters.status} onChange={onFilterChange}>
              <option value="all">Todas as etapas</option>
              {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {isLoading ? <p className="empty">Calculando o pulso comercial...</p> : null}
      {isError ? <p className="empty acquisition-analytics-error">Não foi possível carregar as métricas. Tente novamente.</p> : null}
      {data ? (
        <>
          <div className="acquisition-analytics-kpis">
            <article><span>Movimentos</span><strong>{totals.movements ?? 0}</strong><small>ações no período</small></article>
            <article><span>Novos leads</span><strong>{totals.newLeads ?? 0}</strong><small>entradas na carteira</small></article>
            <article><span>Contatos</span><strong>{totals.contacts ?? 0}</strong><small>ligações, mensagens e e-mails</small></article>
            <article><span>Reuniões</span><strong>{totals.meetings ?? 0}</strong><small>movimentos registrados</small></article>
            <article><span>Propostas</span><strong>{totals.proposals ?? 0}</strong><small>envios registrados</small></article>
            <article className={totals.overdue ? "attention" : ""}><span>Follow-ups vencidos</span><strong>{totals.overdue ?? 0}</strong><small>pedem ação agora</small></article>
          </div>

          <div className="acquisition-intelligence-grid">
            <article className="acquisition-chart-card">
              <div className="acquisition-subheading">
                <div><h4>Movimentos na linha do tempo</h4><p>Cada ponto representa ações registradas no dia.</p></div>
                <span>{data.rangeDays === 1 ? "Hoje" : `${data.rangeDays} dias`}</span>
              </div>
              <div className="acquisition-chart-shell" aria-label="Gráfico de movimentos de aquisição por dia">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.series} margin={{ top: 12, right: 12, left: -18, bottom: 4 }}>
                    <CartesianGrid stroke="#e6ebf2" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fill: "#667085", fontSize: 11 }} minTickGap={22} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "#667085", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip labelFormatter={(value) => `Dia ${formatChartDate(value)}`} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                    {movementLines.map((item) => (
                      <Line key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={item.color} strokeWidth={2} dot={data.rangeDays <= 7} activeDot={{ r: 4 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <aside className="acquisition-cadence-card">
              <div className="acquisition-subheading"><div><h4>Cadência</h4><p>Onde o esforço perdeu ritmo.</p></div></div>
              <div className="acquisition-cadence-metrics">
                <p><span>Primeiro contato</span><strong>{formatHours(totals.averageFirstContactHours)}</strong></p>
                <p><span>Oportunidades paradas</span><strong>{totals.stalled ?? 0}</strong></p>
                <p><span>Avanços de etapa</span><strong>{totals.statusChanges ?? 0}</strong></p>
                <p><span>Fechadas no período</span><strong>{totals.closed ?? 0}</strong></p>
              </div>
              <div className="acquisition-alert-list">
                {(data.alerts || []).length ? data.alerts.slice(0, 4).map((item) => (
                  <button key={item.id} type="button" onClick={() => document.getElementById(`acquisition-lead-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                    <span><strong>{item.venueName}</strong><small>{statusLabelMap[item.status] || item.status}</small></span>
                    <b>{item.idleDays} dias</b>
                  </button>
                )) : <p className="acquisition-no-alerts">Nenhuma oportunidade está parada há 7 dias ou mais.</p>}
              </div>
            </aside>
          </div>

          <div className="acquisition-funnel-strip">
            <div><h4>Carteira por etapa</h4><p>Distribuição atual, independente do período selecionado.</p></div>
            <div className="acquisition-funnel-bars">
              {statusDistribution.map((item) => (
                <span key={item.status} title={`${statusLabelMap[item.status] || item.status}: ${item.count}`}>
                  <i style={{ width: `${Math.max(8, (item.count / maxStatusCount) * 100)}%` }} />
                  <small>{statusLabelMap[item.status] || item.status}</small>
                  <b>{item.count}</b>
                </span>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function formatFollowUpShort(value) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).replace(",", " ·");
}

function getFollowUpTone(value, status) {
  if (!value || ["closed", "lost"].includes(status)) return "none";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "none";

  const diff = date.getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff <= 24 * 60 * 60 * 1000) return "today";
  if (diff <= 48 * 60 * 60 * 1000) return "soon";
  return "later";
}

function isOverdue(value, status) {
  if (!value || ["closed", "lost"].includes(status)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function buildPayload(form) {
  const coordinatePair = parseCoordinatePair(form.coordinates);
  const { coordinates: _coordinates, ...payloadForm } = form;

  return {
    ...payloadForm,
    latitude: coordinatePair ? coordinatePair.latitude : toFloatOrNull(form.latitude),
    longitude: coordinatePair ? coordinatePair.longitude : toFloatOrNull(form.longitude),
    nextFollowUpAt: toIsoOrNull(form.nextFollowUpAt),
    presentationAt: toIsoOrNull(form.presentationAt)
  };
}

function getLeadAddressLine(lead) {
  const street = [lead.address, lead.addressNumber].filter(Boolean).join(", ");
  return [
    street,
    lead.addressComplement,
    lead.neighborhood
  ].filter(Boolean).join(" - ");
}

function hasPreciseCoordinates(lead) {
  return isUsableCoordinatePair(lead.latitude, lead.longitude);
}

function TerritoryMapBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = points.map(({ coords }) => coords);
    map.invalidateSize();
    map.fitBounds(bounds, {
      padding: [34, 34],
      maxZoom: 13
    });
  }, [map, points]);

  return null;
}

function TerritoryMap({ leads }) {
  const points = useMemo(
    () => leads.map((lead, index) => ({
      lead,
      coords: getLeadCoordinates(lead, index),
      pathOptions: getLeadMarkerStyle(lead)
    })),
    [leads]
  );

  return (
    <article className="clean-card acquisition-territory-card">
      <div className="acquisition-territory-header">
        <div>
          <h3>Território</h3>
          <p className="meta-line">
            Mapa de batalha comercial: veja onde estão as casas mapeadas e priorize o próximo contato.
          </p>
        </div>
        <div className="territory-legend">
          <span><i className="legend-dot legend-hot" /> quente</span>
          <span><i className="legend-dot legend-warm" /> morna</span>
          <span><i className="legend-dot legend-cold" /> fria</span>
          <span><i className="legend-dot legend-closed" /> fechada</span>
        </div>
      </div>

      <div className="territory-map-shell">
        {points.length ? (
          <MapContainer
            key={`territory-${points.length}-${points.map(({ lead }) => lead.id).join("-")}`}
            center={DEFAULT_MAP_CENTER}
            zoom={11}
            scrollWheelZoom={false}
            className="territory-map"
          >
            <TileLayer
              attribution={territoryTileLayer.attribution}
              url={territoryTileLayer.url}
            />
            <TerritoryMapBounds points={points} />
            {points.map(({ lead, coords, pathOptions }) => (
              <CircleMarker
                key={lead.id}
                center={coords}
                radius={7}
                pathOptions={pathOptions}
                className="territory-circle-marker"
              >
                <Popup className="territory-popup">
                  <div className="territory-popup-card">
                    <div className="territory-popup-head">
                      <strong>{lead.venueName}</strong>
                      <span className={`acquisition-temp temp-${lead.temperature}`}>
                        {temperatureLabelMap[lead.temperature] || lead.temperature}
                      </span>
                    </div>
                    <p>{getLeadAddressLine(lead) || [lead.neighborhood, lead.region, lead.city].filter(Boolean).join(" - ") || "Local a completar"}</p>
                    <p>{[lead.region, lead.city].filter(Boolean).join(" - ")}</p>
                    <small>{statusLabelMap[lead.status] || lead.status} {hasPreciseCoordinates(lead) ? "- ponto preciso" : "- ponto aproximado"}</small>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        ) : (
          <div className="territory-map-empty">
            Cadastre oportunidades para visualizar o território.
          </div>
        )}
      </div>
    </article>
  );
}

export default function AcquisitionAdminPanel({ onToast }) {
  const leadFormRef = useRef(null);
  const [filters, setFilters] = useState({ q: "", status: "all", temperature: "all", followUp: "all" });
  const [leadForm, setLeadForm] = useState(initialLeadForm);
  const [editingLeadId, setEditingLeadId] = useState("");
  const [expandedLeadId, setExpandedLeadId] = useState("");
  const [interactionLeadId, setInteractionLeadId] = useState("");
  const [interactionForm, setInteractionForm] = useState(initialInteractionForm);
  const [analyticsFilters, setAnalyticsFilters] = useState({ days: 30, status: "all" });

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
  const { data: timelineData, isLoading: timelineLoading } = useAcquisitionLeadTimelineQuery(expandedLeadId);
  const createLead = useCreateAcquisitionLeadMutation();
  const updateLead = useUpdateAcquisitionLeadMutation();
  const deleteLead = useDeleteAcquisitionLeadMutation();
  const createInteraction = useCreateAcquisitionInteractionMutation();

  const leads = data?.items || [];
  const summary = data?.summary || {};

  function handleLeadChange(event) {
    const { name, value } = event.target;
    if (name === "coordinates") {
      const coordinatePair = parseCoordinatePair(value);
      setLeadForm((current) => ({
        ...current,
        coordinates: value,
        ...(coordinatePair ? {
          latitude: String(coordinatePair.latitude),
          longitude: String(coordinatePair.longitude)
        } : {})
      }));
      return;
    }
    setLeadForm((current) => ({ ...current, [name]: value }));
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleAnalyticsFilterChange(event) {
    const { name, value } = event.target;
    setAnalyticsFilters((current) => ({ ...current, [name]: name === "days" ? Number(value) : value }));
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
    setExpandedLeadId(lead.id);
    setLeadForm({
      venueName: lead.venueName || "",
      city: lead.city || "São Paulo",
      region: lead.region || "",
      neighborhood: lead.neighborhood || "",
      address: lead.address || "",
      addressNumber: lead.addressNumber || "",
      addressComplement: lead.addressComplement || "",
      zipCode: lead.zipCode || "",
      coordinates: formatCoordinatePair(lead.latitude, lead.longitude),
      latitude: lead.latitude ?? "",
      longitude: lead.longitude ?? "",
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
    window.requestAnimationFrame(() => {
      leadFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function handleDeleteLead(leadId) {
    if (!window.confirm("Excluir esta oportunidade de aquisição?")) return;
    try {
      await deleteLead.mutateAsync(leadId);
      if (expandedLeadId === leadId) setExpandedLeadId("");
      if (interactionLeadId === leadId) setInteractionLeadId("");
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

      <AcquisitionIntelligence filters={analyticsFilters} onFilterChange={handleAnalyticsFilterChange} />

      <div className="admin-content-divider" />

      <TerritoryMap leads={leads} />

      <div className="acquisition-grid">
        <form ref={leadFormRef} className="venue-form acquisition-form" onSubmit={handleLeadSubmit}>
          <h3>{editingLeadId ? "Editar oportunidade" : "Nova oportunidade"}</h3>
          <p className="meta-line">Use este bloco para organizar contato comercial com casas ainda fora da carteira.</p>
          <input name="venueName" value={leadForm.venueName} onChange={handleLeadChange} placeholder="Nome da casa" required />
          <input name="address" value={leadForm.address} onChange={handleLeadChange} placeholder="Rua / avenida" />
          <div className="form-actions-inline">
            <input name="addressNumber" value={leadForm.addressNumber} onChange={handleLeadChange} placeholder="Número" />
            <input name="addressComplement" value={leadForm.addressComplement} onChange={handleLeadChange} placeholder="Complemento" />
            <input name="zipCode" value={leadForm.zipCode} onChange={handleLeadChange} placeholder="CEP" />
          </div>
          <div className="form-actions-inline">
            <input name="city" value={leadForm.city} onChange={handleLeadChange} placeholder="Cidade" />
            <input name="region" value={leadForm.region} onChange={handleLeadChange} placeholder="Região" />
          </div>
          <div className="form-actions-inline">
            <input name="neighborhood" value={leadForm.neighborhood} onChange={handleLeadChange} placeholder="Bairro" />
            <input name="instagramUrl" value={leadForm.instagramUrl} onChange={handleLeadChange} placeholder="Instagram" />
          </div>
          <label className="field-with-helper">
            <span>Coordenadas do pin</span>
            <input
              name="coordinates"
              value={leadForm.coordinates}
              onChange={handleLeadChange}
              placeholder="-23.55785686465512, -46.69008834914753"
              inputMode="decimal"
            />
            <small>Cole latitude e longitude como o Google Maps entrega. Sem coordenadas, o mapa aproxima pela região.</small>
          </label>
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
              const expanded = expandedLeadId === lead.id;
              const followUpTone = getFollowUpTone(lead.nextFollowUpAt, lead.status);
              const shortLocation = [lead.neighborhood, lead.region].filter(Boolean).join(" - ") || "Local a completar";
              return (
                <article id={`acquisition-lead-${lead.id}`} key={lead.id} className={`clean-card acquisition-lead-card acquisition-lead-compact${overdue ? " overdue" : ""}${expanded ? " expanded" : ""}`}>
                  <div className="acquisition-lead-row">
                    <div className="acquisition-lead-title">
                      <h4>{lead.venueName}</h4>
                      <p>{shortLocation}</p>
                    </div>
                    <div className="acquisition-pill-stack">
                      <span className={`acquisition-temp temp-${lead.temperature}`}>{temperatureLabelMap[lead.temperature] || lead.temperature}</span>
                      <span className="acquisition-status">{statusLabelMap[lead.status] || lead.status}</span>
                    </div>
                    <span className={`acquisition-followup acquisition-followup-${followUpTone}`}>
                      {followUpTone !== "none" ? <span className="acquisition-followup-icon">!</span> : null}
                      <span>{formatFollowUpShort(lead.nextFollowUpAt)}</span>
                    </span>
                    <div className="acquisition-card-actions acquisition-row-actions">
                      <button
                        type="button"
                        className="chip acquisition-icon-action acquisition-action-edit"
                        data-tooltip="Editar"
                        onClick={() => handleEditLead(lead)}
                      />
                      <button
                        type="button"
                        className="chip acquisition-icon-action acquisition-action-note"
                        data-tooltip="Registrar contato"
                        onClick={() => {
                          setExpandedLeadId(lead.id);
                          setInteractionLeadId(lead.id);
                          setInteractionForm(initialInteractionForm);
                        }}
                      />
                      <button
                        type="button"
                        className="chip acquisition-expand-toggle"
                        data-tooltip={expanded ? "Recolher" : "Abrir detalhes"}
                        onClick={() => setExpandedLeadId(expanded ? "" : lead.id)}
                      >
                        {expanded ? "-" : "+"}
                      </button>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="acquisition-lead-details">
                      <div className="acquisition-detail-grid">
                        <p><strong>Endereço</strong><span>{getLeadAddressLine(lead) || "Endereço a completar"}</span></p>
                        <p><strong>Local</strong><span>{[lead.neighborhood, lead.region, lead.city].filter(Boolean).join(" - ") || "Local a completar"}</span></p>
                        <p><strong>Contato</strong><span>{lead.contactName || "Contato não informado"} {lead.contactRole ? `- ${lead.contactRole}` : ""}</span></p>
                        <p><strong>Próximo passo</strong><span>{lead.latestInteraction?.nextAction || "Sem próxima ação registrada"}</span></p>
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

                      <section className="acquisition-timeline">
                        <div className="acquisition-timeline-heading">
                          <h5>Linha do tempo</h5>
                          <span>{timelineData?.items?.length || 0} movimentos</span>
                        </div>
                        {timelineLoading ? <p className="meta-line">Carregando histórico...</p> : null}
                        {!timelineLoading && timelineData?.items?.length ? (
                          <ol>
                            {timelineData.items.map((item) => (
                              <li key={item.id}>
                                <i className={`timeline-dot timeline-${item.kind}`} />
                                <div>
                                  <strong>{timelineTitle(item)}</strong>
                                  <span>{formatDateTime(item.occurredAt)} · {actorName(item.actor)}</span>
                                  {item.nextAction ? <small>Próxima ação: {item.nextAction}</small> : null}
                                </div>
                              </li>
                            ))}
                          </ol>
                        ) : null}
                        {!timelineLoading && timelineData && !timelineData.items?.length ? <p className="meta-line">Nenhum movimento registrado.</p> : null}
                      </section>

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
                        <button type="button" className="chip chip-danger" onClick={() => handleDeleteLead(lead.id)} disabled={deleteLead.isPending}>
                          Excluir oportunidade
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
