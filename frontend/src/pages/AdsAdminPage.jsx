import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  useAdCampaignsQuery,
  useAdsActivityQuery,
  useAdDeliveryQuery,
  useAdsReportQuery,
  useCreateAdCampaignMutation,
  useCreateAdCreativeMutation,
  useUpdateAdCampaignMutation,
  useUpdateAdCreativeMutation
} from "../hooks/useEventsQuery";
import { useAuthStore } from "../store/authStore";

const SLOT_OPTIONS = [
  "explore_feed_large",
  "venue_detail_inline",
  "radar_header"
];
const SLOT_LABELS = {
  explore_feed_large: "Explorar (Card Grande)",
  venue_detail_inline: "Detalhe da Casa",
  radar_header: "Topo do Radar"
};
const SLOT_RATIOS = {
  explore_feed_large: 16 / 6,
  venue_detail_inline: 16 / 5,
  radar_header: 16 / 5
};

const INITIAL_CAMPAIGN = {
  advertiser: "",
  name: "",
  status: "draft",
  priority: 1,
  startsAt: "",
  endsAt: "",
  runInAllSlots: false,
  isEnabled: true
};

const INITIAL_CREATIVE = {
  campaignId: "",
  slot: "explore_feed_large",
  imageUrl: "",
  destinationUrl: "",
  title: "",
  altText: "",
  width: "",
  height: "",
  isEnabled: true
};

export default function AdsAdminPage() {
  const user = useAuthStore((state) => state.user);
  const [adsSection, setAdsSection] = useState("overview");
  const [reportDays, setReportDays] = useState(30);
  const [simulatorSlot, setSimulatorSlot] = useState("explore_feed_large");
  const [campaignQuery, setCampaignQuery] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all");
  const { data: campaigns = [], isLoading } = useAdCampaignsQuery(true);
  const { data: report, isLoading: reportLoading } = useAdsReportQuery(reportDays, true);
  const { data: activity = [], isLoading: activityLoading } = useAdsActivityQuery(25, true);
  const { data: simulatedDelivery, isLoading: simLoading } = useAdDeliveryQuery(simulatorSlot, true);
  const createCampaign = useCreateAdCampaignMutation();
  const updateCampaign = useUpdateAdCampaignMutation();
  const createCreative = useCreateAdCreativeMutation();
  const updateCreative = useUpdateAdCreativeMutation();

  const [campaignForm, setCampaignForm] = useState(INITIAL_CAMPAIGN);
  const [creativeForm, setCreativeForm] = useState(INITIAL_CREATIVE);
  const [message, setMessage] = useState("");
  const [confirmEndCampaign, setConfirmEndCampaign] = useState(null);

  const orderedCampaigns = useMemo(
    () => [...campaigns].sort((a, b) => (b.priority || 0) - (a.priority || 0)),
    [campaigns]
  );
  const filteredCampaigns = useMemo(() => {
    const q = campaignQuery.trim().toLowerCase();
    return orderedCampaigns.filter((item) => {
      const statusOk = campaignStatusFilter === "all" ? true : item.status === campaignStatusFilter;
      const text = `${item.name} ${item.advertiser}`.toLowerCase();
      const queryOk = q ? text.includes(q) : true;
      return statusOk && queryOk;
    });
  }, [orderedCampaigns, campaignQuery, campaignStatusFilter]);
  const expiredActiveCampaigns = useMemo(() => {
    const now = Date.now();
    return orderedCampaigns.filter((item) => item.status === "active" && item.endsAt && new Date(item.endsAt).getTime() < now);
  }, [orderedCampaigns]);
  const activeWithoutCreatives = useMemo(
    () => orderedCampaigns.filter((item) => item.status === "active" && item.creatives.length === 0),
    [orderedCampaigns]
  );
  const activeMissingSlots = useMemo(() => {
    return orderedCampaigns
      .filter((item) => item.status === "active" && !item.runInAllSlots)
      .map((item) => {
        const slots = new Set(item.creatives.map((creative) => creative.slot));
        const missing = SLOT_OPTIONS.filter((slot) => !slots.has(slot));
        return { item, missing };
      })
      .filter((row) => row.missing.length > 0);
  }, [orderedCampaigns]);
  const coverageBySlot = useMemo(() => {
    const map = Object.fromEntries(SLOT_OPTIONS.map((slot) => [slot, 0]));
    for (const campaign of orderedCampaigns) {
      if (campaign.status !== "active" || !campaign.isEnabled) continue;
      if (campaign.runInAllSlots) {
        SLOT_OPTIONS.forEach((slot) => { map[slot] += 1; });
        continue;
      }
      const slotSet = new Set(campaign.creatives.filter((c) => c.isEnabled).map((c) => c.slot));
      SLOT_OPTIONS.forEach((slot) => {
        if (slotSet.has(slot)) map[slot] += 1;
      });
    }
    return map;
  }, [orderedCampaigns]);
  const topByImpressions = useMemo(() => report?.campaigns?.[0] || null, [report]);
  const dailyChartData = useMemo(
    () => (report?.daily || []).map((day) => ({
      date: day.date?.slice(5) || day.date,
      impressions: day.impressions,
      clicks: day.clicks
    })),
    [report]
  );
  const slotsChartData = useMemo(
    () => (report?.slots || []).map((slot) => ({
      slot: slot.slot.replaceAll("_", " "),
      impressions: slot.impressions,
      clicks: slot.clicks
    })),
    [report]
  );
  const bestCtrCampaign = useMemo(() => {
    if (!report?.campaigns?.length) return null;
    return [...report.campaigns].sort((a, b) => b.ctr - a.ctr)[0];
  }, [report]);
  const ratioWarning = useMemo(() => {
    if (!creativeForm.width || !creativeForm.height) return "";
    const current = Number(creativeForm.width) / Number(creativeForm.height);
    const target = SLOT_RATIOS[creativeForm.slot];
    if (!Number.isFinite(current) || !Number.isFinite(target)) return "";
    const delta = Math.abs(current - target) / target;
    if (delta > 0.12) {
      return `Proporcao fora do ideal para ${creativeForm.slot}. Recomendada: ${target.toFixed(2)}.`;
    }
    return "";
  }, [creativeForm.width, creativeForm.height, creativeForm.slot]);

  async function handleCreateCampaign(event) {
    event.preventDefault();
    setMessage("");
    try {
      await createCampaign.mutateAsync({
        ...campaignForm,
        startsAt: campaignForm.startsAt ? new Date(campaignForm.startsAt).toISOString() : null,
        endsAt: campaignForm.endsAt ? new Date(campaignForm.endsAt).toISOString() : null
      });
      setCampaignForm(INITIAL_CAMPAIGN);
      setMessage("Campanha criada.");
    } catch (_error) {
      setMessage("Não foi possivel criar campanha.");
    }
  }

  async function duplicateCampaign(item) {
    setMessage("");
    try {
      const copied = await createCampaign.mutateAsync({
        advertiser: item.advertiser,
        name: `${item.name} (copia)`,
        status: "draft",
        priority: item.priority,
        startsAt: item.startsAt || null,
        endsAt: item.endsAt || null,
        runInAllSlots: item.runInAllSlots,
        isEnabled: false
      });

      for (const creative of item.creatives) {
        await createCreative.mutateAsync({
          campaignId: copied.id,
          payload: {
            slot: creative.slot,
            title: creative.title || null,
            imageUrl: creative.imageUrl,
            destinationUrl: creative.destinationUrl || null,
            altText: creative.altText || null,
            isEnabled: creative.isEnabled
          }
        });
      }
      setMessage("Campanha duplicada em rascunho.");
    } catch (_error) {
      setMessage("Falha ao duplicar campanha.");
    }
  }

  async function pauseExpiredCampaigns() {
    if (expiredActiveCampaigns.length === 0) return;
    setMessage("");
    try {
      await Promise.all(
        expiredActiveCampaigns.map((item) =>
          updateCampaign.mutateAsync({
            id: item.id,
            payload: { status: "paused" }
          })
        )
      );
      setMessage("Campanhas expiradas pausadas.");
    } catch (_error) {
      setMessage("Não foi possivel pausar todas as campanhas expiradas.");
    }
  }

  async function setCampaignStatus(item, status) {
    try {
      await updateCampaign.mutateAsync({
        id: item.id,
        payload: { status }
      });
      setMessage(`Campanha atualizada para ${status}.`);
    } catch (_error) {
      setMessage("Falha ao atualizar status da campanha.");
    }
  }

  async function applyStatusBulk(status) {
    if (filteredCampaigns.length === 0) {
      setMessage("Nenhuma campanha no filtro atual.");
      return;
    }
    try {
      await Promise.all(
        filteredCampaigns.map((item) =>
          updateCampaign.mutateAsync({
            id: item.id,
            payload: { status }
          })
        )
      );
      setMessage(`Status aplicado em lote: ${status}.`);
    } catch (_error) {
      setMessage("Falha ao aplicar status em lote.");
    }
  }

  async function handleCreateCreative(event) {
    event.preventDefault();
    if (!creativeForm.campaignId) {
      setMessage("Selecione uma campanha para o criativo.");
      return;
    }
    setMessage("");
    try {
      await createCreative.mutateAsync({
        campaignId: creativeForm.campaignId,
        payload: {
          slot: creativeForm.slot,
          imageUrl: creativeForm.imageUrl,
          destinationUrl: creativeForm.destinationUrl || null,
          title: creativeForm.title || null,
          altText: creativeForm.altText || null,
          width: creativeForm.width ? Number(creativeForm.width) : null,
          height: creativeForm.height ? Number(creativeForm.height) : null,
          isEnabled: creativeForm.isEnabled
        }
      });
      setCreativeForm((prev) => ({
        ...INITIAL_CREATIVE,
        campaignId: prev.campaignId
      }));
      setMessage("Criativo adicionado.");
    } catch (_error) {
      setMessage("Não foi possivel adicionar criativo.");
    }
  }

  async function toggleCampaign(item) {
    try {
      await updateCampaign.mutateAsync({
        id: item.id,
        payload: { isEnabled: !item.isEnabled }
      });
    } catch (_error) {
      setMessage("Falha ao atualizar campanha.");
    }
  }

  async function toggleCreative(item) {
    try {
      await updateCreative.mutateAsync({
        id: item.id,
        payload: { isEnabled: !item.isEnabled }
      });
    } catch (_error) {
      setMessage("Falha ao atualizar criativo.");
    }
  }

  function handleExportReportCsv() {
    if (!report) return;
    const rows = [
      ["tipo", "nome", "status", "impressoes", "cliques", "ctr_percentual"],
      ...report.campaigns.map((item) => [
        "campanha",
        item.campaignName,
        item.status,
        item.impressions,
        item.clicks,
        item.ctr
      ]),
      ...report.slots.map((slot) => [
        "slot",
        slot.slot,
        "-",
        slot.impressions,
        slot.clicks,
        slot.ctr
      ])
    ];
    const csv = rows.map((line) => line.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ads-report-${reportDays}d.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <section className="screen screen-history screen-ads-hard">
      <header className="page-header admin-page-header">
        <div className="admin-page-header-main">
          <h2>Gestão de Publicidade</h2>
          <p>Campanhas, criativos por slot e toggles de exibicao.</p>
          <div className="role-session-wrap">
            <div className="role-session-badge">Perfil ativo: {(user?.role || "admin").toUpperCase()}</div>
            <span className="role-live-indicator" aria-label="Perfil ativo ao vivo">LIVE</span>
          </div>
        </div>
        <img src="/assets/brand/icon_mono_77Gira.svg" alt="77Gira" className="admin-page-icon" />
      </header>
      <div className="ads-layout">
        <aside className="ads-sidebar">
          {[
            ["overview", "Visão Geral"],
            ["campaigns", "Campanhas"],
            ["creatives", "Criativos por Slot"],
            ["health", "Saúde e Alertas"],
            ["activity", "Atividade"],
            ["reports", "Relatórios"]
          ].map(([id, label]) => (
            <button key={id} className={`chip ${adsSection === id ? "active" : ""}`} onClick={() => setAdsSection(id)}>{label}</button>
          ))}
        </aside>
        <div className="ads-content">

      {(adsSection === "overview" || adsSection === "reports") ? (
      <>
      <section className="ads-hard-kpis">
        <article className="clean-card">
          <h4>Impressoes</h4>
          <p>{report?.summary?.impressions ?? 0}</p>
        </article>
        <article className="clean-card">
          <h4>Cliques</h4>
          <p>{report?.summary?.clicks ?? 0}</p>
        </article>
        <article className="clean-card">
          <h4>CTR Geral</h4>
          <p>
            {report?.summary?.impressions
              ? `${((report.summary.clicks / report.summary.impressions) * 100).toFixed(2)}%`
              : "0.00%"}
          </p>
        </article>
        <article className="clean-card">
          <h4>Campanhas</h4>
          <p>{filteredCampaigns.length}</p>
        </article>
      </section>

      <section className="ads-hard-grid">

      <section className="clean-card">
        <div className="form-actions-inline">
          <strong>Métricas</strong>
          <select value={reportDays} onChange={(e) => setReportDays(Number(e.target.value))}>
            <option value={7}>7 dias</option>
            <option value={15}>15 dias</option>
            <option value={30}>30 dias</option>
            <option value={60}>60 dias</option>
          </select>
          <button type="button" className="chip" onClick={handleExportReportCsv} disabled={!report}>
            Exportar CSV
          </button>
        </div>
        {reportLoading ? <p className="meta-line">Carregando métricas...</p> : null}
        {report ? (
          <>
            <p className="meta-line">
              Impressoes: {report.summary.impressions} | Cliques: {report.summary.clicks} | CTR geral:{" "}
              {report.summary.impressions > 0 ? ((report.summary.clicks / report.summary.impressions) * 100).toFixed(2) : "0.00"}%
            </p>
            <p className="meta-line">
              Top volume: {topByImpressions ? `${topByImpressions.campaignName} (${topByImpressions.impressions})` : "-"} | Melhor CTR:{" "}
              {bestCtrCampaign ? `${bestCtrCampaign.campaignName} (${bestCtrCampaign.ctr}%)` : "-"}
            </p>
            <div className="ads-chart-grid">
              <article className="ads-chart-card">
                <p className="meta-line">Entrega diaria</p>
                <div className="ads-chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyChartData}>
                      <defs>
                        <linearGradient id="adsImpGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9fb5c8" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#9fb5c8" stopOpacity={0.03} />
                        </linearGradient>
                        <linearGradient id="adsClickGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d28b42" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#d28b42" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(166,181,195,0.12)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#8ea1b3", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#8ea1b3", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip
                        contentStyle={{
                          background: "#0f1821",
                          border: "1px solid rgba(158,175,191,0.2)",
                          borderRadius: 3,
                          color: "#d1dbe5"
                        }}
                      />
                      <Area type="monotone" dataKey="impressions" stroke="#9fb5c8" fill="url(#adsImpGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="clicks" stroke="#d28b42" fill="url(#adsClickGrad)" strokeWidth={1.8} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </article>
              <article className="ads-chart-card">
                <p className="meta-line">Comparativo por slot</p>
                <div className="ads-chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={slotsChartData} barGap={4}>
                      <CartesianGrid stroke="rgba(166,181,195,0.1)" vertical={false} />
                      <XAxis dataKey="slot" tick={{ fill: "#8ea1b3", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#8ea1b3", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip
                        contentStyle={{
                          background: "#0f1821",
                          border: "1px solid rgba(158,175,191,0.2)",
                          borderRadius: 3,
                          color: "#d1dbe5"
                        }}
                      />
                      <Bar dataKey="impressions" fill="#9fb5c8" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="clicks" fill="#d28b42" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>
            <div className="venue-list">
              {report.slots.map((slot) => (
                <article key={slot.slot} className="clean-card">
                  <h4>{SLOT_LABELS[slot.slot] || slot.slot}</h4>
                  <p className="meta-line">{slot.impressions} imp / {slot.clicks} cliques</p>
                  <small>CTR {slot.ctr}%</small>
                </article>
              ))}
            </div>
            <details className="achievements-completed">
              <summary>Evolucao diaria ({report.daily?.length || 0} dias com eventos)</summary>
              <div className="venue-list">
                {(report.daily || []).map((day) => (
                  <p key={day.date} className="meta-line">
                    {day.date}: {day.impressions} imp / {day.clicks} cliques / CTR {day.ctr}%
                  </p>
                ))}
              </div>
            </details>
            <details className="achievements-completed">
              <summary>Campanhas ({report.campaigns.length})</summary>
              <div className="clean-cards compact">
                {report.campaigns.map((item) => (
                  <article key={item.campaignId} className="clean-card unlocked">
                    <h4>{item.campaignName}</h4>
                    <p>{item.advertiser} - {item.status}</p>
                    <small>{item.impressions} imp / {item.clicks} cliques / CTR {item.ctr}%</small>
                  </article>
                ))}
              </div>
            </details>
          </>
        ) : null}
      </section>

      <section className="clean-card">
        <div className="form-actions-inline">
          <strong>Cobertura por slot</strong>
        </div>
        <div className="venue-list">
          {SLOT_OPTIONS.map((slot) => (
            <p key={slot} className="meta-line">
              [{slot}] campanhas aptas: {coverageBySlot[slot] || 0}
            </p>
          ))}
        </div>
      </section>

      <section className="clean-card">
        <div className="form-actions-inline">
          <strong>Simulador de entrega</strong>
          <select value={simulatorSlot} onChange={(e) => setSimulatorSlot(e.target.value)}>
            {SLOT_OPTIONS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
          </select>
        </div>
        {simLoading ? <p className="meta-line">Simulando...</p> : null}
        {!simLoading && !simulatedDelivery ? <p className="meta-line">Sem entrega para este slot no momento.</p> : null}
        {simulatedDelivery ? (
          <div className="ads-slot-preview">
            <small>{simulatedDelivery.campaignName}</small>
            <img src={simulatedDelivery.imageUrl} alt={simulatedDelivery.altText || simulatedDelivery.title || "preview"} />
          </div>
        ) : null}
      </section>
      </section>
      </>
      ) : null}

      {(adsSection === "overview" || adsSection === "activity") ? (
      <section className="ads-hard-grid">
        <section className="clean-card">
          <div className="form-actions-inline">
            <strong>Atividade recente</strong>
          </div>
          {activityLoading ? <p className="meta-line">Carregando atividade...</p> : null}
          <div className="venue-list">
            {activity.map((item) => (
              <p key={item.id} className="meta-line">
                {new Date(item.createdAt).toLocaleString("pt-BR")} | {item.type} | {item.slot} | {item.campaignName}
              </p>
            ))}
          </div>
        </section>
      </section>
      ) : null}

      {(adsSection === "campaigns") ? (
      <section className="ads-hard-grid ads-hard-forms">
      <form className="venue-form clean-card" onSubmit={handleCreateCampaign}>
        <h3 className="section-title">Nova campanha</h3>
        <input
          placeholder="Anunciante"
          value={campaignForm.advertiser}
          onChange={(e) => setCampaignForm((prev) => ({ ...prev, advertiser: e.target.value }))}
          required
        />
        <input
          placeholder="Nome da campanha"
          value={campaignForm.name}
          onChange={(e) => setCampaignForm((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
        <div className="form-actions-inline">
          <input
            type="datetime-local"
            value={campaignForm.startsAt}
            onChange={(e) => setCampaignForm((prev) => ({ ...prev, startsAt: e.target.value }))}
          />
          <input
            type="datetime-local"
            value={campaignForm.endsAt}
            onChange={(e) => setCampaignForm((prev) => ({ ...prev, endsAt: e.target.value }))}
          />
        </div>
        <div className="form-actions-inline">
          <select value={campaignForm.status} onChange={(e) => setCampaignForm((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="draft">Rascunho</option>
            <option value="active">Ativa</option>
            <option value="paused">Pausada</option>
            <option value="ended">Encerrada</option>
          </select>
          <input
            type="number"
            min="1"
            max="10"
            value={campaignForm.priority}
            onChange={(e) => setCampaignForm((prev) => ({ ...prev, priority: Number(e.target.value || 1) }))}
          />
        </div>
        <label className="meta-line">
          <input
            type="checkbox"
            checked={campaignForm.runInAllSlots}
            onChange={(e) => setCampaignForm((prev) => ({ ...prev, runInAllSlots: e.target.checked }))}
          /> Rodar em todos os slots
        </label>
        <label className="meta-line">
          <input
            type="checkbox"
            checked={campaignForm.isEnabled}
            onChange={(e) => setCampaignForm((prev) => ({ ...prev, isEnabled: e.target.checked }))}
          /> Campanha habilitada
        </label>
        <button className="btn-primary" type="submit" disabled={createCampaign.isPending}>
          {createCampaign.isPending ? "Criando..." : "Criar campanha"}
        </button>
      </form>
      </section>
      ) : null}

      {(adsSection === "creatives") ? (
      <section className="ads-hard-grid ads-hard-forms">
      <form className="venue-form clean-card" onSubmit={handleCreateCreative}>
        <h3 className="section-title">Novo criativo</h3>
        <select
          value={creativeForm.campaignId}
          onChange={(e) => setCreativeForm((prev) => ({ ...prev, campaignId: e.target.value }))}
          required
        >
          <option value="">Selecione a campanha</option>
          {orderedCampaigns.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select
          value={creativeForm.slot}
          onChange={(e) => setCreativeForm((prev) => ({ ...prev, slot: e.target.value }))}
        >
          {SLOT_OPTIONS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
        </select>
        <input
          placeholder="URL da imagem"
          value={creativeForm.imageUrl}
          onChange={(e) => setCreativeForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
          required
        />
        <input
          placeholder="Link de destino (opcional)"
          value={creativeForm.destinationUrl}
          onChange={(e) => setCreativeForm((prev) => ({ ...prev, destinationUrl: e.target.value }))}
        />
        <div className="form-actions-inline">
          <input
            type="number"
            min="1"
            placeholder="Largura (px)"
            value={creativeForm.width}
            onChange={(e) => setCreativeForm((prev) => ({ ...prev, width: e.target.value }))}
          />
          <input
            type="number"
            min="1"
            placeholder="Altura (px)"
            value={creativeForm.height}
            onChange={(e) => setCreativeForm((prev) => ({ ...prev, height: e.target.value }))}
          />
        </div>
        {ratioWarning ? <p className="field-error">{ratioWarning}</p> : null}
        <button className="btn-primary" type="submit" disabled={createCreative.isPending}>
          {createCreative.isPending ? "Salvando..." : "Adicionar criativo"}
        </button>
      </form>
      </section>
      ) : null}

      {message ? <p className="empty">{message}</p> : null}
      {(adsSection === "health" || adsSection === "overview") ? (
      <>
      {(activeWithoutCreatives.length > 0 || activeMissingSlots.length > 0) ? (
        <div className="empty empty-highlight">
          <strong>Saúde de campanhas</strong>
          {activeWithoutCreatives.length > 0 ? (
            <p className="meta-line">{activeWithoutCreatives.length} campanha(s) ativas sem criativo.</p>
          ) : null}
          {activeMissingSlots.length > 0 ? (
            <p className="meta-line">{activeMissingSlots.length} campanha(s) ativas com slots faltando.</p>
          ) : null}
        </div>
      ) : null}
      {expiredActiveCampaigns.length > 0 ? (
        <p className="empty empty-highlight">
          {expiredActiveCampaigns.length} campanha(s) ativas com data final expirada.
          {" "}
          <button className="btn-link" type="button" onClick={pauseExpiredCampaigns}>Pausar expiradas</button>
        </p>
      ) : null}
      </>
      ) : null}
      {(adsSection === "campaigns" || adsSection === "overview") ? (
      <>
      {isLoading ? <p className="empty">Carregando campanhas...</p> : null}
      {!isLoading ? (
        <div className="admin-list-header">
          <strong>Campanhas ({filteredCampaigns.length})</strong>
          <input
            className="search-input"
            placeholder="Buscar campanha ou anunciante..."
            value={campaignQuery}
            onChange={(e) => setCampaignQuery(e.target.value)}
          />
          <select value={campaignStatusFilter} onChange={(e) => setCampaignStatusFilter(e.target.value)}>
            <option value="all">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="active">Ativa</option>
            <option value="paused">Pausada</option>
            <option value="ended">Encerrada</option>
          </select>
          <div className="admin-actions-row">
            <button className="chip" type="button" onClick={() => applyStatusBulk("active")}>Ativar filtradas</button>
            <button className="chip" type="button" onClick={() => applyStatusBulk("paused")}>Pausar filtradas</button>
          </div>
        </div>
      ) : null}

      <div className="venue-list">
        {filteredCampaigns.map((item) => (
          <article key={item.id} className="venue-card">
            <div>
              <h3>{item.name}</h3>
              <p className="meta-line">{item.advertiser} - prioridade {item.priority}</p>
              <p className="meta-line">
                Status:
                {" "}
                <span className={`status-badge status-${item.status}`}>{item.status}</span>
                {" "}
                | {item.runInAllSlots ? "Todos os slots" : "Por slot"}
              </p>
              {item.startsAt || item.endsAt ? (
                <p className="meta-line">
                  Janela: {item.startsAt ? new Date(item.startsAt).toLocaleString("pt-BR") : "sem inicio"} ate {item.endsAt ? new Date(item.endsAt).toLocaleString("pt-BR") : "sem fim"}
                </p>
              ) : null}
              <p className="meta-line">Criativos: {item.creatives.length}</p>
              {SLOT_OPTIONS.map((slot) => {
                const slotCreative = item.creatives.find((creative) => creative.slot === slot);
                if (!slotCreative) return null;
                return (
                  <div key={`${item.id}-${slot}`} className="ads-slot-preview">
                    <small>{SLOT_LABELS[slot] || slot}</small>
                    <img src={slotCreative.imageUrl} alt={slotCreative.altText || slotCreative.title || slot} />
                  </div>
                );
              })}
              {item.creatives.map((creative) => (
                <p key={creative.id} className="meta-line">
                  [{creative.slot}] {creative.title || "Sem titulo"} - {creative.isEnabled ? "ativo" : "inativo"}
                  {" "}
                  <button className="btn-link" type="button" onClick={() => toggleCreative(creative)}>
                    {creative.isEnabled ? "desligar" : "ligar"}
                  </button>
                </p>
              ))}
            </div>
            <button className="chip" type="button" onClick={() => toggleCampaign(item)}>
              {item.isEnabled ? "Desligar campanha" : "Ligar campanha"}
            </button>
            <button className="chip" type="button" onClick={() => setCampaignStatus(item, "active")}>
              Ativar
            </button>
            <button className="chip" type="button" onClick={() => setCampaignStatus(item, "paused")}>
              Pausar
            </button>
            <button className="chip" type="button" onClick={() => setConfirmEndCampaign(item)}>
              Encerrar
            </button>
            <button className="chip" type="button" onClick={() => duplicateCampaign(item)}>
              Duplicar
            </button>
          </article>
        ))}
      </div>
      </>
      ) : null}

      {confirmEndCampaign ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Encerrar campanha?</h3>
            <p className="meta-line">
              Esta acao muda o status de <strong>{confirmEndCampaign.name}</strong> para encerrada.
            </p>
            <div className="form-actions-inline">
              <button
                className="btn-primary"
                type="button"
                onClick={async () => {
                  await setCampaignStatus(confirmEndCampaign, "ended");
                  setConfirmEndCampaign(null);
                }}
              >
                Confirmar encerramento
              </button>
              <button className="chip" type="button" onClick={() => setConfirmEndCampaign(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
      </div>
    </section>
  );
}


