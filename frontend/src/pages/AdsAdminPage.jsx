import { useEffect, useMemo, useState } from "react";
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
  useAdReviewHistoryQuery,
  useAdReviewQueueQuery,
  useAdPlacementsQuery,
  useAdvertiserAccountQuery,
  useAdvertiserAccountsQuery,
  useApproveAdvertiserAccessRequestMutation,
  useAdsActivityQuery,
  useAdDeliveryQuery,
  useAdsHealthQuery,
  useAdsReportQuery,
  useCreateAdCampaignMutation,
  useCreateAdvertiserAccountMutation,
  useCreateAdvertiserMembershipMutation,
  useCreateAdCreativeMutation,
  useRejectAdvertiserAccessRequestMutation,
  useRevokeAdvertiserMembershipMutation,
  useSetCampaignAdvertiserAccountMutation,
  useSubmitAdReviewMutation,
  useDecideAdReviewMutation,
  useUpdateAdCampaignMutation,
  useUpdateAdvertiserAccountMutation,
  useUpdateAdvertiserMembershipMutation,
  useUpdateAdCreativeMutation,
  useUploadAdCreativeAssetMutation
} from "../hooks/useEventsQuery";
import { useAuthStore } from "../store/authStore";
import AdsPlacementMockup from "../components/ads/AdsPlacementMockup";
import { getAdsBillingOperations, processAdminMockPaymentOrder } from "../services/events.service";

const ADVERTISER_ACCOUNTS_ENABLED =
  String(import.meta.env.VITE_ADS_ADVERTISER_ACCOUNTS_ENABLED || "").toLowerCase() === "true";
const PLACEMENT_CATALOG_ENABLED =
  String(import.meta.env.VITE_ADS_PLACEMENT_CATALOG_ENABLED || "").toLowerCase() === "true";
const R2_CREATIVE_UPLOAD_ENABLED =
  String(import.meta.env.VITE_ADS_R2_CREATIVE_UPLOAD_ENABLED || "").toLowerCase() === "true";
const REVIEW_WORKFLOW_ENABLED =
  String(import.meta.env.VITE_ADS_REVIEW_WORKFLOW_ENABLED || "").toLowerCase() === "true";
const CREDITS_PURCHASE_ENABLED =
  String(import.meta.env.VITE_ADS_CREDITS_PURCHASE_ENABLED || "").toLowerCase() === "true";

const SLOT_OPTIONS = [
  "explore_feed_large",
  "venue_detail_inline",
  "radar_header",
  "venue_menu_sponsor"
];
const SLOT_LABELS = {
  explore_feed_large: "Explorar (Card Grande)",
  venue_detail_inline: "Detalhe da Casa",
  radar_header: "Topo do Radar",
  venue_menu_sponsor: "Cardapio da Casa"
};
const SLOT_RATIOS = {
  explore_feed_large: 580 / 350,
  venue_detail_inline: 580 / 240,
  radar_header: 580 / 258,
  venue_menu_sponsor: 3 / 4
};
const SLOT_ASPECT_RATIOS = {
  explore_feed_large: "58 / 35",
  venue_detail_inline: "29 / 12",
  radar_header: "290 / 129",
  venue_menu_sponsor: "3 / 4"
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
  isEnabled: true,
  storageProvider: null,
  storageKey: null,
  mimeType: null,
  fileSizeBytes: null,
  checksum: null,
  assetVersion: 1
};

const INITIAL_ADVERTISER_ACCOUNT = {
  name: "",
  type: "unclassified",
  status: "draft",
  legalName: "",
  contactEmail: "",
  contactPhone: "",
  commercialCategory: "",
  notes: ""
};

const ADVERTISER_TYPES = ["unclassified", "venue", "producer", "artist", "brand", "agency", "group", "internal"];
const ADVERTISER_STATUSES = ["draft", "pending_review", "active", "suspended", "rejected", "archived"];
const MEMBERSHIP_ROLES = ["owner", "admin", "campaign_manager", "analyst", "billing_manager", "viewer"];
const MEMBERSHIP_STATUSES = ["invited", "active", "suspended", "revoked"];

function getReviewChecklist(item) {
  if (item.entityType === "creative") {
    return [
      "Imagem compatível com o slot e sem corte crítico.",
      "Texto, arte e destino não prometem algo enganoso.",
      "Campanha vinculada tem contexto claro.",
      "Marca, casa, artista ou produtor são identificáveis."
    ];
  }
  return [
    "Anunciante e objetivo comercial fazem sentido para o 77Gira.",
    "Período da campanha está coerente com evento, casa ou ação.",
    "Criativos existem ou já foram enviados para revisão.",
    "A campanha não compromete a experiência editorial do app."
  ];
}

function getReviewContextText(item) {
  if (item.entityType === "creative") {
    return "Valide principalmente imagem, destino e adequação ao slot antes de aprovar.";
  }
  return "Valide intenção comercial, período e relação com a conta anunciante antes de aprovar.";
}

function ReviewPlacementPreview({ item }) {
  const isCreative = item.entityType === "creative";
  const slot = isCreative ? item.slot : "explore_feed_large";
  const imageUrl = isCreative ? item.imageUrl : "";
  const title = isCreative ? (item.title || item.campaign?.name || item.label) : item.label;
  const placeholder = isCreative ? "Arquivo do criativo indisponível" : "Campanha sem imagem própria";

  return (
    <div className="ads-review-placement-preview">
      <div className={`ads-review-asset ${imageUrl ? "has-image" : "is-placeholder"}`} style={{ "--ads-review-aspect": SLOT_ASPECT_RATIOS[slot] || "58 / 35" }}>
        {imageUrl ? <img src={imageUrl} alt={item.altText || title} /> : <span>{placeholder}</span>}
      </div>
      <div className="ads-review-mobile-preview">
        <AdsPlacementMockup slot={slot} imageUrl={imageUrl} title={title} className="ads-review-placement-device" />
        <small>{isCreative ? "Prévia de veiculação no touchpoint selecionado." : "A prévia será preenchida quando um criativo for enviado."}</small>
      </div>
    </div>
  );
}

function hasApprovedReview(value) {
  return !REVIEW_WORKFLOW_ENABLED || value === null || value === "approved" || value === "active";
}

function hasCampaignBudget(campaign) {
  return CREDITS_PURCHASE_ENABLED && Number(campaign.creditBalance || campaign.budgetCredits || 0) > 0;
}

function getCampaignReadinessBlockers(campaign) {
  const approvedCreatives = (campaign.creatives || []).filter(
    (creative) => creative.isEnabled && hasApprovedReview(creative.reviewStatus)
  );
  const blockers = [];
  if (!hasApprovedReview(campaign.reviewStatus)) blockers.push("aguarda aprovação da campanha");
  if (!approvedCreatives.length) blockers.push("sem criativo aprovado e habilitado");
  if (!hasCampaignBudget(campaign)) blockers.push("sem patacos/créditos vinculados");
  if (campaign.endsAt && new Date(campaign.endsAt).getTime() < Date.now()) blockers.push("janela de veiculação encerrada");
  return blockers;
}

function getCampaignOpsBlockers(campaign) {
  const now = Date.now();
  const blockers = [];
  if (!campaign.isEnabled || campaign.status !== "active") blockers.push("Campanha precisa estar ativa e habilitada.");
  if (campaign.startsAt && new Date(campaign.startsAt).getTime() > now) blockers.push("Janela de veiculação ainda não começou.");
  getCampaignReadinessBlockers(campaign).forEach((blocker) => blockers.push(blocker));
  return blockers;
}

export default function AdsAdminPage() {
  const user = useAuthStore((state) => state.user);
  const [adsSection, setAdsSection] = useState("overview");
  const [reportDays, setReportDays] = useState(30);
  const [simulatorSlot, setSimulatorSlot] = useState("explore_feed_large");
  const [campaignQuery, setCampaignQuery] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all");
  const [advertiserQuery, setAdvertiserQuery] = useState("");
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewView, setReviewView] = useState("pending");
  const { data: campaigns = [], isLoading } = useAdCampaignsQuery(true);
  const { data: reviewQueue = { campaigns: [], creatives: [] }, isLoading: reviewQueueLoading } = useAdReviewQueueQuery(REVIEW_WORKFLOW_ENABLED);
  const { data: reviewHistory = [] } = useAdReviewHistoryQuery(selectedReview?.entityType, selectedReview?.id, REVIEW_WORKFLOW_ENABLED && Boolean(selectedReview));
  const { data: report, isLoading: reportLoading } = useAdsReportQuery(reportDays, true);
  const { data: deliveryHealth, isLoading: healthLoading } = useAdsHealthQuery(24, true);
  const { data: activity = [], isLoading: activityLoading } = useAdsActivityQuery(25, true);
  const { data: simulatedDelivery, isLoading: simLoading } = useAdDeliveryQuery(simulatorSlot, true, { preview: true });
  const {
    data: placements = [],
    isLoading: placementsLoading,
    isError: placementsError
  } = useAdPlacementsQuery(PLACEMENT_CATALOG_ENABLED);
  const {
    data: advertiserAccounts = [],
    isLoading: advertiserAccountsLoading,
    isError: advertiserAccountsError
  } = useAdvertiserAccountsQuery({ limit: 100 }, ADVERTISER_ACCOUNTS_ENABLED);
  const {
    data: selectedAdvertiser,
    isLoading: selectedAdvertiserLoading
  } = useAdvertiserAccountQuery(selectedAdvertiserId, ADVERTISER_ACCOUNTS_ENABLED);
  const createCampaign = useCreateAdCampaignMutation();
  const updateCampaign = useUpdateAdCampaignMutation();
  const createCreative = useCreateAdCreativeMutation();
  const updateCreative = useUpdateAdCreativeMutation();
  const uploadAdCreativeAsset = useUploadAdCreativeAssetMutation();
  const createAdvertiserAccount = useCreateAdvertiserAccountMutation();
  const updateAdvertiserAccount = useUpdateAdvertiserAccountMutation();
  const approveAdvertiserAccess = useApproveAdvertiserAccessRequestMutation();
  const rejectAdvertiserAccess = useRejectAdvertiserAccessRequestMutation();
  const createAdvertiserMembership = useCreateAdvertiserMembershipMutation();
  const updateAdvertiserMembership = useUpdateAdvertiserMembershipMutation();
  const revokeAdvertiserMembership = useRevokeAdvertiserMembershipMutation();
  const setCampaignAdvertiserAccount = useSetCampaignAdvertiserAccountMutation();
  const submitReview = useSubmitAdReviewMutation();
  const decideReview = useDecideAdReviewMutation();

  const [campaignForm, setCampaignForm] = useState(INITIAL_CAMPAIGN);
  const [creativeForm, setCreativeForm] = useState(INITIAL_CREATIVE);
  const [advertiserForm, setAdvertiserForm] = useState(INITIAL_ADVERTISER_ACCOUNT);
  const [editingAdvertiserId, setEditingAdvertiserId] = useState(null);
  const [showAdvertiserForm, setShowAdvertiserForm] = useState(false);
  const [showManualCampaignForm, setShowManualCampaignForm] = useState(false);
  const [showManualCreativeForm, setShowManualCreativeForm] = useState(false);
  const [membershipForm, setMembershipForm] = useState({ email: "", role: "viewer", status: "invited" });
  const [campaignToLinkId, setCampaignToLinkId] = useState("");
  const [message, setMessage] = useState("");
  const [confirmEndCampaign, setConfirmEndCampaign] = useState(null);
  const [selectedCampaignCreatives, setSelectedCampaignCreatives] = useState(null);
  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingProcessingId, setBillingProcessingId] = useState("");

  async function handleReviewDecision(item, decision) {
    try {
      await decideReview.mutateAsync({ entityType: item.entityType, id: item.id, decision, reason: reviewReason });
      setMessage(decision === "approve" ? "Item aprovado." : decision === "request-changes" ? "Ajustes solicitados ao anunciante." : "Item rejeitado e removido da fila pendente.");
      setReviewReason("");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível registrar a decisão.");
    }
  }

  async function handleSubmitReview(entityType, id) {
    try {
      await submitReview.mutateAsync({ entityType, id });
      setMessage("Item enviado para revisão.");
      setAdsSection("reviews");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível enviar para revisão.");
    }
  }

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
  const filteredAdvertiserAccounts = useMemo(() => {
    const query = advertiserQuery.trim().toLowerCase();
    if (!query) return advertiserAccounts;
    return advertiserAccounts.filter((item) =>
      `${item.name} ${item.legalName || ""} ${item.contactEmail || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [advertiserAccounts, advertiserQuery]);
  const pendingAdvertiserRequests = useMemo(
    () => advertiserAccounts.filter((item) => item.source === "self_service_request" && item.status === "pending_review"),
    [advertiserAccounts]
  );
  const unlinkedCampaigns = useMemo(
    () => campaigns.filter((campaign) => !campaign.advertiserAccountId),
    [campaigns]
  );
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
  const campaignOpsBlockers = useMemo(
    () => orderedCampaigns
      .map((item) => ({ item, blockers: getCampaignOpsBlockers(item) }))
      .filter((row) => row.blockers.length > 0),
    [orderedCampaigns]
  );
  const campaignsBlockedByCredits = useMemo(
    () => campaignOpsBlockers.filter((row) => row.blockers.some((blocker) => blocker.toLowerCase().includes("patacos"))),
    [campaignOpsBlockers]
  );
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
  const reviewCampaignCount = reviewQueue.campaigns?.length || 0;
  const reviewCreativeCount = reviewQueue.creatives?.length || 0;
  const reviewQueueCount = reviewCampaignCount + reviewCreativeCount;
  const reviewBuckets = {
    pending: { label: "Pendentes", campaigns: reviewQueue.campaigns || [], creatives: reviewQueue.creatives || [] },
    changes: { label: "Ajustes solicitados", campaigns: reviewQueue.changesRequested?.campaigns || [], creatives: reviewQueue.changesRequested?.creatives || [] },
    rejected: { label: "Rejeitadas", campaigns: reviewQueue.rejected?.campaigns || [], creatives: reviewQueue.rejected?.creatives || [] }
  };
  const activeReviewBucket = reviewBuckets[reviewView];
  const activeReviewItems = [
    ...activeReviewBucket.campaigns.map((item) => ({ ...item, entityType: "campaign", label: item.name, detail: item.advertiser })),
    ...activeReviewBucket.creatives.map((item) => ({ ...item, entityType: "creative", label: item.title || item.slot, detail: item.campaign?.name || "Criativo" }))
  ];
  const activeCampaignCount = orderedCampaigns.filter((item) => item.status === "active").length;
  const creativeCount = orderedCampaigns.reduce((total, item) => total + item.creatives.length, 0);
  const healthIssueCount = activeWithoutCreatives.length + activeMissingSlots.length + expiredActiveCampaigns.length + campaignsBlockedByCredits.length;
  const pendingActionCount = pendingAdvertiserRequests.length + reviewQueueCount + healthIssueCount;
  const navItems = [
    ["overview", "Painel", pendingActionCount],
    ...(ADVERTISER_ACCOUNTS_ENABLED ? [["advertisers", "Anunciantes", pendingAdvertiserRequests.length]] : []),
    ...(REVIEW_WORKFLOW_ENABLED ? [["reviews", "Revisão", reviewQueueCount]] : []),
    ["campaigns", "Campanhas", filteredCampaigns.length],
    ["creatives", "Criativos", creativeCount],
    ...(PLACEMENT_CATALOG_ENABLED ? [["inventory", "Inventário", placements.length]] : []),
    ["health", "Saúde", healthIssueCount],
    ["activity", "Atividade", activity.length],
    ...(CREDITS_PURCHASE_ENABLED ? [["billing", "Financeiro", billing?.summary?.orders || 0]] : []),
    ["reports", "Relatórios", report?.daily?.length || 0]
  ];

  async function loadBilling() {
    if (!CREDITS_PURCHASE_ENABLED) return;
    setBillingLoading(true);
    try {
      setBilling(await getAdsBillingOperations());
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível carregar a operação financeira.");
    } finally {
      setBillingLoading(false);
    }
  }

  async function handleAdminPaymentOutcome(orderId, outcome) {
    setBillingProcessingId(orderId);
    try {
      await processAdminMockPaymentOrder(orderId, outcome);
      setMessage(`Pagamento mock atualizado para ${outcome}.`);
      await loadBilling();
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível processar esta simulação.");
    } finally {
      setBillingProcessingId("");
    }
  }

  useEffect(() => {
    if (adsSection === "billing" && CREDITS_PURCHASE_ENABLED) loadBilling();
  }, [adsSection]);

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

  function openCreateAdvertiserForm() {
    setEditingAdvertiserId(null);
    setAdvertiserForm(INITIAL_ADVERTISER_ACCOUNT);
    setShowAdvertiserForm(true);
  }

  function openEditAdvertiserForm(item) {
    setEditingAdvertiserId(item.id);
    setAdvertiserForm({
      name: item.name || "",
      type: item.type || "unclassified",
      status: item.status || "draft",
      legalName: item.legalName || "",
      contactEmail: item.contactEmail || "",
      contactPhone: item.contactPhone || "",
      commercialCategory: item.commercialCategory || "",
      notes: item.notes || ""
    });
    setShowAdvertiserForm(true);
  }

  async function handleSaveAdvertiser(event) {
    event.preventDefault();
    setMessage("");
    const payload = Object.fromEntries(
      Object.entries(advertiserForm).map(([key, value]) => [key, typeof value === "string" && !value.trim() ? null : value])
    );
    payload.name = advertiserForm.name.trim();
    payload.type = advertiserForm.type;
    payload.status = advertiserForm.status;

    try {
      const item = editingAdvertiserId
        ? await updateAdvertiserAccount.mutateAsync({ id: editingAdvertiserId, payload })
        : await createAdvertiserAccount.mutateAsync(payload);
      setSelectedAdvertiserId(item.id);
      setShowAdvertiserForm(false);
      setEditingAdvertiserId(null);
      setAdvertiserForm(INITIAL_ADVERTISER_ACCOUNT);
      setMessage(editingAdvertiserId ? "Conta anunciante atualizada." : "Conta anunciante criada.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível salvar a conta anunciante.");
    }
  }

  async function handleApproveAdvertiserAccess(item) {
    setMessage("");
    try {
      const updated = await approveAdvertiserAccess.mutateAsync({ id: item.id });
      setSelectedAdvertiserId(updated.id);
      setMessage("Solicitacao aprovada. A conta anunciante e seus acessos foram ativados.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível aprovar a solicitação.");
    }
  }

  async function handleRejectAdvertiserAccess(item) {
    setMessage("");
    try {
      const updated = await rejectAdvertiserAccess.mutateAsync({ id: item.id, payload: {} });
      setSelectedAdvertiserId(updated.id);
      setMessage("Solicitacao rejeitada e acessos pendentes revogados.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível rejeitar a solicitação.");
    }
  }

  async function handleAddMembership(event) {
    event.preventDefault();
    if (!selectedAdvertiserId) return;
    setMessage("");
    try {
      await createAdvertiserMembership.mutateAsync({
        accountId: selectedAdvertiserId,
        payload: { ...membershipForm, email: membershipForm.email.trim().toLowerCase() }
      });
      setMembershipForm({ email: "", role: "viewer", status: "invited" });
      setMessage("Usuario vinculado a conta anunciante.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível vincular o usuário.");
    }
  }

  async function handleUpdateMembership(membership, payload) {
    setMessage("");
    try {
      await updateAdvertiserMembership.mutateAsync({
        id: membership.id,
        accountId: selectedAdvertiserId,
        payload
      });
      setMessage("Permissao do membro atualizada.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível atualizar o membro.");
    }
  }

  async function handleRevokeMembership(membership) {
    setMessage("");
    try {
      await revokeAdvertiserMembership.mutateAsync({ id: membership.id, accountId: selectedAdvertiserId });
      setMessage("Acesso do membro revogado.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível revogar o acesso.");
    }
  }

  async function handleLinkCampaign(event) {
    event.preventDefault();
    if (!campaignToLinkId || !selectedAdvertiserId) return;
    setMessage("");
    try {
      await setCampaignAdvertiserAccount.mutateAsync({
        campaignId: campaignToLinkId,
        accountId: selectedAdvertiserId
      });
      setCampaignToLinkId("");
      setMessage("Campanha vinculada a conta anunciante.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível vincular a campanha.");
    }
  }

  async function handleUnlinkCampaign(campaignId) {
    setMessage("");
    try {
      await setCampaignAdvertiserAccount.mutateAsync({ campaignId, accountId: null });
      setMessage("Campanha desvinculada; o anunciante legado foi preservado.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível desvincular a campanha.");
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
        payload: {
          status,
          isEnabled: status === "active"
        }
      });
      setMessage(status === "active" ? "Campanha colocada no ar." : `Campanha atualizada para ${status}.`);
    } catch (_error) {
      setMessage("Falha ao atualizar status da campanha.");
    }
  }

  async function applyStatusBulk(status) {
    const eligibleCampaigns = filteredCampaigns.filter((item) => {
      if (status === "active") return item.status !== "ended" && getCampaignReadinessBlockers(item).length === 0;
      return item.status === "active";
    });
    if (eligibleCampaigns.length === 0) {
      setMessage(status === "active" ? "Nenhuma campanha pronta para entrar no ar no filtro atual." : "Nenhuma campanha ativa no filtro atual.");
      return;
    }
    try {
      await Promise.all(
        eligibleCampaigns.map((item) =>
          updateCampaign.mutateAsync({
            id: item.id,
            payload: { status, isEnabled: status === "active" }
          })
        )
      );
      setMessage(status === "active" ? "Campanhas prontas foram colocadas no ar." : "Campanhas ativas foram pausadas.");
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
          isEnabled: creativeForm.isEnabled,
          storageProvider: creativeForm.storageProvider,
          storageKey: creativeForm.storageKey,
          mimeType: creativeForm.mimeType,
          fileSizeBytes: creativeForm.fileSizeBytes,
          checksum: creativeForm.checksum,
          assetVersion: creativeForm.assetVersion
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

  async function handleCreativeAssetUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!creativeForm.campaignId) {
      setMessage("Selecione uma campanha antes de enviar o criativo.");
      event.target.value = "";
      return;
    }
    setMessage("");
    try {
      const asset = await uploadAdCreativeAsset.mutateAsync({
        file,
        campaignId: creativeForm.campaignId,
        slot: creativeForm.slot
      });
      setCreativeForm((current) => ({
        ...current,
        imageUrl: asset.url,
        width: asset.width,
        height: asset.height,
        storageProvider: asset.storageProvider,
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
        fileSizeBytes: asset.fileSizeBytes,
        checksum: asset.checksum,
        assetVersion: asset.assetVersion
      }));
      setMessage("Criativo enviado ao Cloudflare R2.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível enviar o criativo ao R2.");
    } finally {
      event.target.value = "";
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
      ["tipo", "nome", "status", "solicitacoes", "renderizacoes", "impressoes", "cliques", "ctr_percentual", "viewability_percentual", "inventario_restante"],
      ...report.campaigns.map((item) => [
        "campanha",
        item.campaignName,
        item.status,
        "-",
        "-",
        item.impressions,
        item.clicks,
        item.ctr,
        "-",
        "-"
      ]),
      ...report.slots.map((slot) => [
        "slot",
        slot.slot,
        "-",
        slot.requests || 0,
        slot.rendered || 0,
        slot.impressions,
        slot.clicks,
        slot.ctr,
        slot.viewabilityRate || 0,
        slot.inventoryRemaining ?? 0
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
    <section className="screen screen-history screen-ads-hard ads-admin-console">
      <header className="page-header admin-page-header ads-admin-hero">
        <div className="admin-page-header-main">
          <div className="ads-brand-lockup ads-brand-lockup-admin">
            <img src="/logoads77gira.svg" alt="77Gira Ads" className="ads-brand-logo ads-brand-logo-admin" />
            <span>Operação interna</span>
          </div>
          <h2>Gestão de Publicidade</h2>
          <p>Console de anunciantes, campanhas, criativos, revisão e saúde de entrega.</p>
          <div className="role-session-wrap">
            <div className="role-session-badge">Perfil ativo: {(user?.role || "admin").toUpperCase()}</div>
            <span className="role-live-indicator" aria-label="Perfil ativo ao vivo">LIVE</span>
          </div>
        </div>
        <div className="ads-admin-hero-metrics" aria-label="Resumo operacional de publicidade">
          <article><span>Ativas</span><strong>{activeCampaignCount}</strong></article>
          <article><span>Revisão</span><strong>{reviewQueueCount}</strong></article>
          <article><span>Alertas</span><strong>{healthIssueCount}</strong></article>
        </div>
      </header>
      <div className="ads-layout">
        <aside className="ads-sidebar">
          {navItems.map(([id, label, count]) => (
            <button key={id} className={`chip ads-nav-item ${adsSection === id ? "active" : ""}`} onClick={() => setAdsSection(id)}>
              <span>{label}</span>
              <small>{count}</small>
            </button>
          ))}
        </aside>
        <div className="ads-content">

      {adsSection === "overview" ? (
      <section className="ads-command-center">
        <div className="ads-command-heading">
          <div>
            <span className="eyebrow">Painel operacional</span>
            <h3>O que precisa de decisão no 77Gira Ads</h3>
            <p className="meta-line">
              O workspace do anunciante cria solicitações, campanhas e criativos. Este console existe para revisar,
              aprovar, pausar, auditar e proteger a experiência pública do 77Gira.
            </p>
          </div>
          {REVIEW_WORKFLOW_ENABLED ? (
            <button type="button" className="chip active" onClick={() => setAdsSection("reviews")}>
              Abrir revisão
            </button>
          ) : null}
        </div>

        <div className="ads-command-grid">
          <button type="button" className="clean-card ads-command-card" onClick={() => setAdsSection(ADVERTISER_ACCOUNTS_ENABLED ? "advertisers" : "campaigns")}>
            <span>Solicitações comerciais</span>
            <strong>{pendingAdvertiserRequests.length}</strong>
            <small>Contas anunciantes aguardando aprovação.</small>
          </button>
          <button type="button" className="clean-card ads-command-card" onClick={() => setAdsSection(REVIEW_WORKFLOW_ENABLED ? "reviews" : "campaigns")}>
            <span>Itens em revisão</span>
            <strong>{reviewQueueCount}</strong>
            <small>{reviewCampaignCount} campanha(s) e {reviewCreativeCount} criativo(s).</small>
          </button>
          <button type="button" className="clean-card ads-command-card" onClick={() => setAdsSection("campaigns")}>
            <span>Campanhas ativas</span>
            <strong>{activeCampaignCount}</strong>
            <small>{orderedCampaigns.length} campanha(s) no console.</small>
          </button>
          <button type="button" className="clean-card ads-command-card" onClick={() => setAdsSection("health")}>
            <span>Alertas de saúde</span>
            <strong>{healthIssueCount}</strong>
            <small>Campanhas sem criativo, slot ou janela válida.</small>
          </button>
          <button type="button" className="clean-card ads-command-card ads-command-card-warning" onClick={() => setAdsSection("health")}>
            <span>Patacos / checkout</span>
            <strong>{CREDITS_PURCHASE_ENABLED ? campaignsBlockedByCredits.length : "OFF"}</strong>
            <small>{CREDITS_PURCHASE_ENABLED ? "Campanhas maduras sem crédito." : "Camada financeira ainda bloqueia veiculação comercial."}</small>
          </button>
          <button type="button" className="clean-card ads-command-card" onClick={() => setAdsSection("reports")}>
            <span>Tracking</span>
            <strong>{(report?.summary?.impressions || report?.summary?.clicks) ? "ON" : "0"}</strong>
            <small>Impressões e cliques já alimentam relatórios e atividade.</small>
          </button>
          <button type="button" className="clean-card ads-command-card" onClick={() => setAdsSection("reports")}>
            <span>Inventário por slot</span>
            <strong>{Object.values(coverageBySlot).reduce((sum, value) => sum + value, 0)}</strong>
            <small>Campanhas tecnicamente aptas distribuídas por superfície.</small>
          </button>
          <button type="button" className="clean-card ads-command-card ads-command-card-warning" onClick={() => setAdsSection("health")}>
            <span>Entrega segura</span>
            <strong>{campaignOpsBlockers.length}</strong>
            <small>Bloqueios antes de considerar uma campanha como no ar.</small>
          </button>
        </div>

        <div className="ads-command-next clean-card">
          <div>
            <span className="eyebrow">Próxima ação recomendada</span>
            <strong>
              {pendingActionCount > 0
                ? "Resolver pendências antes de criar novas campanhas manuais."
                : "Operação sem pendências críticas no momento."}
            </strong>
            <p className="meta-line">
              Campanhas e criativos devem nascer prioritariamente no workspace do anunciante. Use criação manual apenas
              para campanhas internas, correções operacionais ou exceções aprovadas pela equipe 77Gira.
            </p>
          </div>
          <div className="ads-command-actions">
            {ADVERTISER_ACCOUNTS_ENABLED ? (
              <button type="button" className="chip" onClick={() => setAdsSection("advertisers")}>Anunciantes</button>
            ) : null}
            <button type="button" className="chip" onClick={() => setAdsSection("campaigns")}>Campanhas</button>
            {PLACEMENT_CATALOG_ENABLED ? (
              <button type="button" className="chip" onClick={() => setAdsSection("inventory")}>Inventário</button>
            ) : null}
          </div>
        </div>

        <div className="ads-admin-funnel clean-card">
          <div>
            <span className="eyebrow">Fios conectados ao workspace</span>
            <strong>Da solicitação à veiculação</strong>
            <p className="meta-line">
              O anunciante cria a demanda no workspace; o Admin 77Gira aprova acesso, revisa campanha/criativo,
              acompanha inventário e segura a publicação quando houver risco editorial ou comercial.
            </p>
          </div>
          <ol>
            <li><span>01</span><strong>Solicitação</strong><small>{pendingAdvertiserRequests.length} aguardando decisão comercial</small></li>
            <li><span>02</span><strong>Revisão</strong><small>{reviewQueueCount} item(ns) aguardando curadoria</small></li>
            <li><span>03</span><strong>Inventário</strong><small>{PLACEMENT_CATALOG_ENABLED ? `${placements.length} placement(s) catalogados` : "Catálogo desativado"}</small></li>
            <li><span>04</span><strong>Saúde</strong><small>{healthIssueCount} alerta(s) operacional(is)</small></li>
          </ol>
        </div>
      </section>
      ) : null}

      {adsSection === "reviews" && REVIEW_WORKFLOW_ENABLED ? (
      <section className="ads-review-section">
        <div className="admin-list-header">
          <div>
            <strong>{activeReviewBucket.label} ({activeReviewItems.length})</strong>
            <p className="meta-line">{reviewView === "pending" ? "Campanhas e criativos aguardando decisão administrativa." : reviewView === "changes" ? "Itens devolvidos ao anunciante para correção antes de uma nova revisão." : "Itens encerrados por rejeição definitiva, mantidos para consulta e auditoria."}</p>
          </div>
        </div>
        <div className="ads-review-guidance clean-card">
          <div>
            <span className="eyebrow">Protocolo de decisão</span>
            <strong>Revisão protege a experiência 77Gira.</strong>
            <p className="meta-line">
              Aprove quando houver legitimidade, contexto e peça adequada. Rejeite ou peça ajuste quando o anúncio parecer
              genérico, enganoso, mal vinculado ao samba ou incompatível com o slot.
            </p>
          </div>
          <div className="ads-review-guidance-metrics">
            <span>{reviewCampaignCount} campanha(s)</span>
            <span>{reviewCreativeCount} criativo(s)</span>
          </div>
        </div>
        <div className="ads-review-tabs" role="tablist" aria-label="Estado das revisões">
          {Object.entries(reviewBuckets).map(([id, bucket]) => <button key={id} type="button" role="tab" aria-selected={reviewView === id} className={reviewView === id ? "active" : ""} onClick={() => setReviewView(id)}>{bucket.label} <b>{bucket.campaigns.length + bucket.creatives.length}</b></button>)}
        </div>
        {reviewQueueLoading ? <p className="empty">Carregando fila...</p> : null}
        {!reviewQueueLoading && activeReviewItems.length === 0 ? <p className="empty">Nenhum item neste recorte.</p> : null}
        <div className="ads-review-grid">
          {activeReviewItems.map((item) => (
            <article key={`${item.entityType}-${item.id}`} className="clean-card ads-review-card">
              <div className="advertiser-readonly-title">
                <div><h3>{item.label}</h3><p className="meta-line">{item.entityType === "campaign" ? "Campanha" : "Criativo"} · {item.detail}</p></div>
                <span className={`status-badge status-${item.reviewStatus || "pending_review"}`}>{reviewView === "changes" ? "ajustes" : reviewView === "rejected" ? "rejeitada" : "pendente"}</span>
              </div>
              <ReviewPlacementPreview item={item} />
              <div className="ads-review-context">
                <strong>{getReviewContextText(item)}</strong>
                <ul>
                  {getReviewChecklist(item).map((row) => <li key={row}>{row}</li>)}
                </ul>
              </div>
              <p className="meta-line">Enviado em {item.submittedAt ? new Date(item.submittedAt).toLocaleString("pt-BR") : "agora"}</p>
              {reviewView === "pending" ? <>
                <textarea placeholder="Motivo obrigatório para solicitar ajuste ou rejeitar" value={selectedReview?.id === item.id ? reviewReason : ""} onFocus={() => setSelectedReview(item)} onChange={(event) => { setSelectedReview(item); setReviewReason(event.target.value); }} />
                <div className="form-actions-inline">
                  <button type="button" className="chip active" disabled={decideReview.isPending} onClick={() => handleReviewDecision(item, "approve")}>Aprovar</button>
                  <button type="button" className="chip" disabled={decideReview.isPending || (selectedReview?.id === item.id && reviewReason.trim().length < 3)} onClick={() => handleReviewDecision(item, "request-changes")}>Solicitar ajustes</button>
                  <button type="button" className="chip danger" disabled={decideReview.isPending || (selectedReview?.id === item.id && reviewReason.trim().length < 3)} onClick={() => handleReviewDecision(item, "reject")}>Rejeitar</button>
                  <button type="button" className="chip" onClick={() => setSelectedReview(item)}>Histórico</button>
                </div>
              </> : <>
                <div className="ads-review-decision-note"><strong>{reviewView === "changes" ? "Ajuste solicitado" : "Rejeição definitiva"}</strong><p>{item.reviewNotes || "Motivo registrado no histórico de revisão."}</p></div>
                <div className="form-actions-inline"><button type="button" className="chip" onClick={() => setSelectedReview(item)}>Histórico</button></div>
              </>}
              {selectedReview?.entityType === item.entityType && selectedReview?.id === item.id && reviewHistory.length ? (
                <ul className="ads-review-history">{reviewHistory.map((entry) => <li key={entry.id}>{entry.action} · {new Date(entry.createdAt).toLocaleString("pt-BR")}{entry.reason ? ` · ${entry.reason}` : ""}</li>)}</ul>
              ) : null}
            </article>
          ))}
        </div>
        <div className="clean-card ads-review-drafts">
          <h3>Prontos para envio</h3>
          {campaigns.filter((item) => ["draft", "rejected", "changes_requested"].includes(item.reviewStatus)).map((item) => (
            <div key={item.id} className="ads-review-draft-row"><span><strong>{item.name}</strong> · campanha · {item.reviewStatus}</span><button type="button" className="chip" onClick={() => handleSubmitReview("campaign", item.id)}>Enviar</button></div>
          ))}
          {campaigns.flatMap((campaign) => campaign.creatives.map((item) => ({ ...item, campaignName: campaign.name }))).filter((item) => ["draft", "rejected", "changes_requested"].includes(item.reviewStatus)).map((item) => (
            <div key={item.id} className="ads-review-draft-row"><span><strong>{item.title || item.slot}</strong> · {item.campaignName} · {item.reviewStatus}</span><button type="button" className="chip" onClick={() => handleSubmitReview("creative", item.id)}>Enviar</button></div>
          ))}
        </div>
      </section>
      ) : null}

      {adsSection === "inventory" && PLACEMENT_CATALOG_ENABLED ? (
      <section className="placement-catalog-section">
        <div className="admin-list-header">
          <div>
            <strong>Inventário canônico ({placements.length})</strong>
            <p className="meta-line">Catalogo somente leitura; delivery permanece no AdSlot legado.</p>
          </div>
        </div>
        {placementsLoading ? <p className="empty">Carregando placements...</p> : null}
        {placementsError ? <p className="empty empty-highlight">Não foi possível carregar o inventário.</p> : null}
        <div className="placement-catalog-grid">
          {placements.map((placement) => (
            <article key={placement.key} className="clean-card placement-catalog-card">
              <div className="advertiser-readonly-title">
                <div>
                  <h3>{placement.name}</h3>
                  <p className="meta-line">{placement.key}</p>
                </div>
                <span className={`status-badge ${placement.isActive ? "status-active" : "status-archived"}`}>
                  {placement.isActive ? "ativo" : "inativo"}
                </span>
              </div>
              <p>{placement.description}</p>
              <dl className="advertiser-readonly-data">
                <div><dt>Slot legado</dt><dd>{placement.legacySlot}</dd></div>
                <div><dt>Superficie</dt><dd>{placement.page} / {placement.surface}</dd></div>
                <div><dt>Dimensao</dt><dd>{placement.recommendedWidth} x {placement.recommendedHeight}</dd></div>
                <div><dt>Proporcao</dt><dd>{placement.aspectRatio}</dd></div>
                <div><dt>Formatos</dt><dd>{placement.allowedMimeTypes.join(", ")}</dd></div>
                <div><dt>Limite</dt><dd>{Math.round(placement.maxFileSizeBytes / 1024 / 1024)} MB</dd></div>
                <div><dt>Capacidade diária</dt><dd>{placement.inventory?.dailyImpressionCap || 0} impressões</dd></div>
                <div><dt>Modo de cobrança</dt><dd>{placement.commercialRules.billingMode === "valid_impression" ? "impressão válida" : "não definido"}</dd></div>
                <div><dt>Dispositivos</dt><dd>mobile e desktop</dd></div>
                <div><dt>Compra</dt><dd>{placement.commercialRules.purchaseEnabled ? "habilitada" : "indisponivel"}</dd></div>
              </dl>
              <p className="meta-line">
                Aprovação: {placement.requiresApproval ? "obrigatória" : "não exigida"} · targeting: {placement.supportsTargeting ? "sim" : "não"} · frequency cap: {placement.supportsFrequencyCap ? "sim" : "não"}
              </p>
            </article>
          ))}
        </div>
      </section>
      ) : null}

      {adsSection === "advertisers" && ADVERTISER_ACCOUNTS_ENABLED ? (
      <section className="advertiser-readonly-section">
        <div className="admin-list-header">
          <div>
            <strong>Contas anunciantes ({filteredAdvertiserAccounts.length})</strong>
            <p className="meta-line">Solicitações, aprovação comercial, responsáveis e vínculo com campanhas.</p>
          </div>
          <input
            className="search-input"
            placeholder="Buscar anunciante..."
            value={advertiserQuery}
            onChange={(event) => setAdvertiserQuery(event.target.value)}
          />
          <button type="button" className="chip" onClick={openCreateAdvertiserForm}>
            Criar conta manual
          </button>
        </div>

        {pendingAdvertiserRequests.length ? (
          <div className="advertiser-approval-queue">
            <div className="advertiser-approval-heading">
              <div>
                <span className="eyebrow">Fila comercial</span>
                <strong>Solicitacoes de acesso aguardando decisao</strong>
                <p className="meta-line">Aprovacao ativa a conta anunciante e libera o workspace para o solicitante.</p>
              </div>
              <span className="status-badge status-pending_review">{pendingAdvertiserRequests.length} pendente(s)</span>
            </div>
            {pendingAdvertiserRequests.map((item) => (
              <article className="advertiser-approval-card" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  {item.notes ? <p className="advertiser-approval-intent">{item.notes}</p> : null}
                  <small className="meta-line">Origem: workspace do anunciante · aprovar acesso não publica campanhas.</small>
                  <p className="meta-line">{item.type} · {item.contactEmail || "sem e-mail"} · {item.legalName || "sem razao social"}</p>
                </div>
                <div className="form-actions-inline">
                  <button
                    type="button"
                    className="chip active"
                    disabled={approveAdvertiserAccess.isPending || rejectAdvertiserAccess.isPending}
                    onClick={() => handleApproveAdvertiserAccess(item)}
                  >
                    Aprovar acesso
                  </button>
                  <button
                    type="button"
                    className="chip"
                    disabled={approveAdvertiserAccess.isPending || rejectAdvertiserAccess.isPending}
                    onClick={() => handleRejectAdvertiserAccess(item)}
                  >
                    Rejeitar
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {showAdvertiserForm ? (
          <form className="venue-form clean-card advertiser-account-form" onSubmit={handleSaveAdvertiser}>
            <strong>{editingAdvertiserId ? "Editar conta anunciante" : "Nova conta anunciante manual"}</strong>
            {!editingAdvertiserId ? (
              <p className="meta-line">
                Use apenas para contas internas ou exceções aprovadas. O fluxo normal começa pela solicitação no
                workspace do anunciante.
              </p>
            ) : null}
            <input
              required
              minLength={2}
              maxLength={160}
              placeholder="Nome da conta"
              value={advertiserForm.name}
              onChange={(event) => setAdvertiserForm((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              maxLength={200}
              placeholder="Razao social (opcional)"
              value={advertiserForm.legalName}
              onChange={(event) => setAdvertiserForm((current) => ({ ...current, legalName: event.target.value }))}
            />
            <select
              aria-label="Tipo da conta anunciante"
              value={advertiserForm.type}
              onChange={(event) => setAdvertiserForm((current) => ({ ...current, type: event.target.value }))}
            >
              {ADVERTISER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select
              aria-label="Status da conta anunciante"
              value={advertiserForm.status}
              onChange={(event) => setAdvertiserForm((current) => ({ ...current, status: event.target.value }))}
            >
              {ADVERTISER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <input
              type="email"
              maxLength={200}
              placeholder="E-mail de contato (opcional)"
              value={advertiserForm.contactEmail}
              onChange={(event) => setAdvertiserForm((current) => ({ ...current, contactEmail: event.target.value }))}
            />
            <input
              maxLength={40}
              placeholder="Telefone (opcional)"
              value={advertiserForm.contactPhone}
              onChange={(event) => setAdvertiserForm((current) => ({ ...current, contactPhone: event.target.value }))}
            />
            <input
              maxLength={80}
              placeholder="Categoria comercial (ex.: cerveja)"
              value={advertiserForm.commercialCategory}
              onChange={(event) => setAdvertiserForm((current) => ({ ...current, commercialCategory: event.target.value }))}
            />
            <textarea
              maxLength={2000}
              placeholder="Observacoes internas (opcional)"
              value={advertiserForm.notes}
              onChange={(event) => setAdvertiserForm((current) => ({ ...current, notes: event.target.value }))}
            />
            <div className="form-actions-inline">
              <button
                type="submit"
                className="auth-btn auth-btn-primary"
                disabled={createAdvertiserAccount.isPending || updateAdvertiserAccount.isPending}
              >
                Salvar conta
              </button>
              <button type="button" className="auth-btn" onClick={() => setShowAdvertiserForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        {advertiserAccountsLoading ? <p className="empty">Carregando anunciantes...</p> : null}
        {advertiserAccountsError ? (
          <p className="empty empty-highlight">Não foi possível carregar as contas anunciantes.</p>
        ) : null}
        {!advertiserAccountsLoading && !advertiserAccountsError && advertiserAccounts.length === 0 ? (
          <div className="empty">
            <strong>Nenhuma conta anunciante cadastrada.</strong>
            <p className="meta-line">As campanhas legadas continuam funcionando normalmente.</p>
          </div>
        ) : null}

        <div className="advertiser-readonly-layout">
          <div className="advertiser-readonly-list">
            {filteredAdvertiserAccounts.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`advertiser-readonly-card ${selectedAdvertiserId === item.id ? "active" : ""}`}
                onClick={() => setSelectedAdvertiserId(item.id)}
              >
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.type} · {item.status}</small>
                </span>
                <span className="advertiser-readonly-counts">
                  {item.counts?.campaigns || 0} campanhas<br />
                  {item.counts?.memberships || 0} membros
                </span>
              </button>
            ))}
          </div>

          <article className="clean-card advertiser-readonly-detail">
            {!selectedAdvertiserId ? (
              <p className="meta-line">Selecione uma conta para consultar seus detalhes.</p>
            ) : null}
            {selectedAdvertiserLoading ? <p className="meta-line">Carregando detalhes...</p> : null}
            {selectedAdvertiser ? (
              <>
                <div className="advertiser-readonly-title">
                  <div>
                    <h3>{selectedAdvertiser.name}</h3>
                    <p className="meta-line">{selectedAdvertiser.legalName || "Sem razao social informada"}</p>
                  </div>
                  <span className={`status-badge status-${selectedAdvertiser.status}`}>
                    {selectedAdvertiser.status}
                  </span>
                </div>
                <button type="button" className="chip" onClick={() => openEditAdvertiserForm(selectedAdvertiser)}>
                  Editar conta
                </button>
                <dl className="advertiser-readonly-data">
                  <div><dt>Tipo</dt><dd>{selectedAdvertiser.type}</dd></div>
                  <div><dt>Origem</dt><dd>{selectedAdvertiser.source}</dd></div>
                  <div><dt>E-mail</dt><dd>{selectedAdvertiser.contactEmail || "Não informado"}</dd></div>
                  <div><dt>Telefone</dt><dd>{selectedAdvertiser.contactPhone || "Não informado"}</dd></div>
                </dl>
                <div className="admin-content-divider" />
                <h4>Campanhas ({selectedAdvertiser.campaigns?.length || 0})</h4>
                <form className="form-actions-inline advertiser-campaign-link" onSubmit={handleLinkCampaign}>
                  <select
                    aria-label="Campanha sem conta anunciante"
                    value={campaignToLinkId}
                    onChange={(event) => setCampaignToLinkId(event.target.value)}
                  >
                    <option value="">Selecionar campanha sem conta...</option>
                    {unlinkedCampaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name} - {campaign.advertiser}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="chip"
                    disabled={!campaignToLinkId || setCampaignAdvertiserAccount.isPending}
                  >
                    Vincular campanha
                  </button>
                </form>
                {(selectedAdvertiser.campaigns || []).map((campaign) => (
                  <div key={campaign.id} className="advertiser-campaign-row">
                    <span className="meta-line">
                      {campaign.name} · {campaign.status} · legado: {campaign.advertiser}
                    </span>
                    <button
                      type="button"
                      className="chip"
                      disabled={setCampaignAdvertiserAccount.isPending}
                      onClick={() => handleUnlinkCampaign(campaign.id)}
                    >
                      Desvincular
                    </button>
                  </div>
                ))}
                {selectedAdvertiser.campaigns?.length === 0 ? (
                  <p className="meta-line">Nenhuma campanha vinculada.</p>
                ) : null}
                <h4>Membros ({selectedAdvertiser.memberships?.length || 0})</h4>
                <form className="venue-form advertiser-membership-form" onSubmit={handleAddMembership}>
                  <input
                    required
                    type="email"
                    placeholder="E-mail do usuario"
                    value={membershipForm.email}
                    onChange={(event) => setMembershipForm((current) => ({ ...current, email: event.target.value }))}
                  />
                  <select
                    aria-label="Papel do novo membro"
                    value={membershipForm.role}
                    onChange={(event) => setMembershipForm((current) => ({ ...current, role: event.target.value }))}
                  >
                    {MEMBERSHIP_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <select
                    aria-label="Status do novo membro"
                    value={membershipForm.status}
                    onChange={(event) => setMembershipForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    {MEMBERSHIP_STATUSES.filter((status) => status !== "revoked").map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <button type="submit" className="chip" disabled={createAdvertiserMembership.isPending}>
                    Adicionar membro
                  </button>
                </form>
                {(selectedAdvertiser.memberships || []).map((membership) => (
                  <div key={membership.id} className="advertiser-membership-row">
                    <span className="meta-line">{membership.user?.email || membership.userId}</span>
                    <select
                      aria-label={`Papel de ${membership.user?.email || membership.userId}`}
                      value={membership.role}
                      disabled={membership.status === "revoked" || updateAdvertiserMembership.isPending}
                      onChange={(event) => handleUpdateMembership(membership, { role: event.target.value })}
                    >
                      {MEMBERSHIP_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                    <select
                      aria-label={`Status de ${membership.user?.email || membership.userId}`}
                      value={membership.status}
                      disabled={membership.status === "revoked" || updateAdvertiserMembership.isPending}
                      onChange={(event) => handleUpdateMembership(membership, { status: event.target.value })}
                    >
                      {MEMBERSHIP_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <button
                      type="button"
                      className="chip"
                      disabled={membership.status === "revoked" || revokeAdvertiserMembership.isPending}
                      onClick={() => handleRevokeMembership(membership)}
                    >
                      Revogar
                    </button>
                  </div>
                ))}
                {selectedAdvertiser.memberships?.length === 0 ? (
                  <p className="meta-line">Nenhum membro vinculado.</p>
                ) : null}
              </>
            ) : null}
          </article>
        </div>
      </section>
      ) : null}

      {adsSection === "billing" && CREDITS_PURCHASE_ENABLED ? (
        <section className="ads-billing-section">
          <div className="ads-section-heading">
            <div>
              <span className="eyebrow">Controle financeiro</span>
              <h3>Patacos, pagamentos e auditoria</h3>
              <p className="meta-line">Visão administrativa do gateway mock. Nenhum registro abaixo representa recebimento financeiro real.</p>
            </div>
            <button className="chip" type="button" onClick={loadBilling} disabled={billingLoading}>{billingLoading ? "Atualizando..." : "Atualizar"}</button>
          </div>
          <div className="ads-billing-warning">
            <strong>AMBIENTE DE SIMULAÇÃO</strong>
            <span>Ordens mock devem ser desativadas antes da integração oficial com o Mercado Pago.</span>
          </div>
          <div className="ads-hard-kpis">
            <article className="clean-card"><h4>Ordens</h4><p>{billing?.summary?.orders || 0}</p></article>
            <article className="clean-card"><h4>Patacos aprovados</h4><p>{billing?.summary?.approvedCredits || 0}</p></article>
            <article className="clean-card"><h4>Saldo livre</h4><p>{billing?.summary?.availableWalletCredits || 0}</p></article>
            <article className="clean-card"><h4>Provedor</h4><p className="ads-billing-provider">{billing?.runtime?.provider || "-"}</p></article>
          </div>
          <article className="clean-card ads-billing-table-card">
            <div className="ads-section-heading"><div><h3>Ordens recentes</h3><p className="meta-line">Referência, conta, campanha e resultado do processamento.</p></div></div>
            {billingLoading && !billing ? <p className="meta-line">Carregando operação...</p> : null}
            <div className="ads-billing-table-wrap">
              <table className="ads-billing-table">
                <thead><tr><th>Conta / campanha</th><th>Pacote</th><th>Status</th><th>Referência</th><th>Ações mock</th></tr></thead>
                <tbody>
                  {(billing?.orders || []).map((order) => (
                    <tr key={order.id}>
                      <td><strong>{order.account?.name}</strong><small>{order.campaign?.name || "Saldo geral"}</small></td>
                      <td><strong>{order.creditAmount} patacos</strong><small>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: order.currency || "BRL" }).format(order.amountCents / 100)} ilustrativos</small></td>
                      <td><span className={`status-badge status-${order.status}`}>{order.status}</span></td>
                      <td><code>{order.externalReference}</code><small>{new Date(order.createdAt).toLocaleString("pt-BR")}</small></td>
                      <td>
                        {["created", "pending"].includes(order.status) ? (
                          <div className="form-actions-inline">
                            <button className="chip active" type="button" disabled={billingProcessingId === order.id} onClick={() => handleAdminPaymentOutcome(order.id, "approved")}>Aprovar teste</button>
                            <button className="chip" type="button" disabled={billingProcessingId === order.id} onClick={() => handleAdminPaymentOutcome(order.id, "rejected")}>Recusar</button>
                          </div>
                        ) : <small>Operação concluída</small>}
                      </td>
                    </tr>
                  ))}
                  {!billing?.orders?.length ? <tr><td colSpan="5"><p className="meta-line">Nenhuma aquisição simulada registrada.</p></td></tr> : null}
                </tbody>
              </table>
            </div>
          </article>
          <article className="clean-card ads-billing-table-card">
            <div className="ads-section-heading"><div><h3>Livro-caixa de patacos</h3><p className="meta-line">Cada crédito e alocação possui chave idempotente e saldo posterior auditável.</p></div></div>
            <div className="ads-billing-ledger">
              {(billing?.entries || []).map((entry) => (
                <div key={entry.id}>
                  <span className={entry.delta >= 0 ? "credit" : "debit"}>{entry.delta >= 0 ? "+" : ""}{entry.delta}</span>
                  <p><strong>{entry.account?.name}</strong><small>{entry.campaign?.name || entry.description || entry.type}</small></p>
                  <small>Saldo: {entry.balanceAfter} · {new Date(entry.createdAt).toLocaleString("pt-BR")}</small>
                </div>
              ))}
              {!billing?.entries?.length ? <p className="meta-line">O livro-caixa ainda está vazio.</p> : null}
            </div>
          </article>
        </section>
      ) : null}

      {adsSection === "reports" ? (
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
                  <p className="meta-line">{slot.impressions} imp / {slot.clicks} cliques / {slot.requests || 0} entregas solicitadas</p>
                  <small>CTR {slot.ctr}% · viewability {slot.viewabilityRate || 0}% · inventário restante {slot.inventoryRemaining ?? 0}</small>
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

      {adsSection === "activity" ? (
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

      {(adsSection === "creatives") ? (
      <section className="ads-manual-admin-panel clean-card">
        <div className="ads-manual-admin-heading">
          <div>
            <span className="eyebrow">Ferramenta interna</span>
            <strong>Adicionar criativo manualmente</strong>
            <p className="meta-line">
              Use para ajustes internos, reposição de asset ou campanhas operadas pela equipe. O fluxo completo de
              envio e revisão deve permanecer conectado ao workspace do anunciante.
            </p>
          </div>
          <button type="button" className="chip" onClick={() => setShowManualCreativeForm((current) => !current)}>
            {showManualCreativeForm ? "Ocultar formulário" : "Adicionar criativo"}
          </button>
        </div>
      {showManualCreativeForm ? (
      <form className="venue-form ads-manual-admin-form" onSubmit={handleCreateCreative}>
        <h3 className="section-title">Novo criativo manual</h3>
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
        {R2_CREATIVE_UPLOAD_ENABLED ? (
          <label className="meta-line">
            Enviar imagem ao Cloudflare R2
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!creativeForm.campaignId || uploadAdCreativeAsset.isPending}
              onChange={handleCreativeAssetUpload}
            />
          </label>
        ) : null}
        <input
          placeholder="URL da imagem"
          value={creativeForm.imageUrl}
          onChange={(e) => setCreativeForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
          required
        />
        {creativeForm.storageProvider ? (
          <p className="meta-line">
            {creativeForm.storageProvider} · {creativeForm.mimeType} · {Math.round(creativeForm.fileSizeBytes / 1024)} KB
          </p>
        ) : null}
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
      ) : null}
      </section>
      ) : null}

      {adsSection === "creatives" ? (
      <section className="ads-creative-ops">
        <div className="admin-list-header">
          <div>
            <strong>Biblioteca de criativos ({creativeCount})</strong>
            <p className="meta-line">Arquivos aprovados, em revisão e suspensos. A entrega normal é habilitada pela aprovação; estes controles são apenas para intervenção operacional.</p>
          </div>
        </div>
        <div className="ads-creative-grid">
          {orderedCampaigns.flatMap((campaign) =>
            campaign.creatives.map((creative) => (
              <article key={creative.id} className="clean-card ads-creative-admin-card">
                <div className="advertiser-readonly-title">
                  <div>
                    <h3>{creative.title || SLOT_LABELS[creative.slot] || creative.slot}</h3>
                    <p className="meta-line">{campaign.name} · {campaign.advertiser}</p>
                  </div>
                  <span className={`status-badge ${creative.isEnabled ? "status-active" : "status-draft"}`}>
                    {creative.isEnabled ? "habilitado" : "suspenso"}
                  </span>
                </div>
                <div className={`ads-slot-preview ads-slot-preview-${creative.slot || "generic"}`}>
                  <small>{SLOT_LABELS[creative.slot] || creative.slot}</small>
                  <img src={creative.imageUrl} alt={creative.altText || creative.title || creative.slot} />
                </div>
                <p className="meta-line">
                  Destino: {creative.destinationUrl || "sem link"} · Revisão: {creative.reviewStatus || "draft"}
                </p>
                <button className="chip" type="button" disabled={creative.reviewStatus !== "approved"} title={creative.reviewStatus !== "approved" ? "A aprovação habilita este criativo automaticamente." : "Controle excepcional de entrega"} onClick={() => toggleCreative(creative)}>
                  {creative.isEnabled ? "Suspender entrega" : "Retomar entrega"}
                </button>
              </article>
            ))
          )}
        </div>
        {creativeCount === 0 ? <p className="empty">Nenhum criativo cadastrado ainda.</p> : null}
      </section>
      ) : null}

      {message ? <p className="empty">{message}</p> : null}
      {adsSection === "health" ? (
      <>
      {healthLoading ? <p className="empty">Lendo sinais de entrega...</p> : null}
      {deliveryHealth ? <section className="clean-card ads-delivery-health">
        <div className="advertiser-readonly-title"><div><span className="eyebrow">MONITORAMENTO</span><h3>Saúde da entrega</h3><p className="meta-line">Sinais das últimas 24 horas. Alertas não expõem dados pessoais de usuários.</p></div><span className={`status-badge ${deliveryHealth.summary.criticalCount ? "status-rejected" : deliveryHealth.summary.alertCount ? "status-pending_review" : "status-active"}`}>{deliveryHealth.summary.alertCount ? `${deliveryHealth.summary.alertCount} alerta(s)` : "estável"}</span></div>
        <div className="ads-delivery-health-kpis"><span><b>{deliveryHealth.summary.deliveries}</b> entregas</span><span><b>{deliveryHealth.summary.validImpressions}</b> impressões</span><span><b>{deliveryHealth.summary.clicks}</b> cliques</span><span><b>{deliveryHealth.summary.criticalCount}</b> críticos</span></div>
        {deliveryHealth.alerts.length ? <div className="ads-delivery-alert-list">{deliveryHealth.alerts.map((alert) => <article key={alert.code} className={alert.severity}><strong>{alert.title}</strong><span>{alert.count}</span><small>{alert.detail}</small></article>)}</div> : <p className="meta-line">Nenhum sinal crítico ou anormal foi detectado neste período.</p>}
        <div className="ads-delivery-inventory">{deliveryHealth.inventory.map((item) => <span key={item.slot}><strong>{SLOT_LABELS[item.slot] || item.slot}</strong><small>{item.used}/{item.capacity} impressões · {item.utilization}% usado</small></span>)}</div>
      </section> : null}
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
      <section className="clean-card ads-health-blockers">
        <div className="advertiser-readonly-title">
          <div>
            <span className="eyebrow">Entrega segura</span>
            <h3>Bloqueios antes de ir ao ar</h3>
            <p className="meta-line">Campanha aprovada não deve ser confundida com campanha veiculando. Estes pontos seguram a entrega.</p>
          </div>
          <span className="status-badge status-draft">{campaignOpsBlockers.length} bloqueio(s)</span>
        </div>
        {campaignOpsBlockers.length ? (
          <div className="ads-health-blocker-list">
            {campaignOpsBlockers.map(({ item, blockers }) => (
              <article key={item.id}>
                <strong>{item.name}</strong>
                <small>{item.advertiser} · {item.status} · {item.reviewStatus || "sem revisão"}</small>
                <ul>
                  {blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <p className="meta-line">Nenhum bloqueio operacional encontrado para as campanhas atuais.</p>
        )}
      </section>
      </>
      ) : null}
      {adsSection === "campaigns" ? (
      <>
      {isLoading ? <p className="empty">Carregando campanhas...</p> : null}
      {!isLoading ? (
        <div className="admin-list-header ads-campaigns-header">
          <div>
            <strong>Operação de campanhas ({filteredCampaigns.length})</strong>
            <p className="meta-line">Acompanhe prontidão e veiculação. A revisão editorial e os arquivos ficam em seus ambientes próprios.</p>
          </div>
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
            <button className="chip" type="button" onClick={() => applyStatusBulk("active")}>Colocar prontas no ar</button>
            <button className="chip" type="button" onClick={() => applyStatusBulk("paused")}>Pausar ativas</button>
          </div>
        </div>
      ) : null}

      <div className="venue-list ads-campaigns-list">
        {filteredCampaigns.map((item) => {
          const readinessBlockers = getCampaignReadinessBlockers(item);
          const slotLabels = [...new Set(item.creatives.map((creative) => SLOT_LABELS[creative.slot] || creative.slot))];
          const isEnded = item.status === "ended";
          const isActive = item.status === "active";
          const canActivate = !isEnded && readinessBlockers.length === 0;
          return (
          <article key={item.id} className="venue-card ads-campaign-operation-card">
            <div className="ads-campaign-operation-summary">
              <h3>{item.name}</h3>
              <p className="meta-line">{item.advertiser} - prioridade {item.priority}</p>
              <div className="ads-campaign-operation-status">
                <span className={`status-badge status-${item.status}`}>{item.status}</span>
                <span>{item.runInAllSlots ? "Todos os slots compatíveis" : "Posições definidas"}</span>
                <span>{item.creatives.length} criativo(s)</span>
              </div>
              {item.startsAt || item.endsAt ? (
                <p className="meta-line">
                  Janela: {item.startsAt ? new Date(item.startsAt).toLocaleString("pt-BR") : "sem inicio"} ate {item.endsAt ? new Date(item.endsAt).toLocaleString("pt-BR") : "sem fim"}
                </p>
              ) : null}
              {slotLabels.length ? <p className="meta-line">Posições: {slotLabels.join(" · ")}</p> : null}
              {readinessBlockers.length ? (
                <p className="ads-campaign-readiness">Para veicular: {readinessBlockers.join(" · ")}.</p>
              ) : (
                <p className="ads-campaign-ready">Pronta para operação comercial.</p>
              )}
            </div>
            <div className="ads-campaign-operation-actions">
              <button className="chip" type="button" onClick={() => setSelectedCampaignCreatives(item)}>
                Ver criativos ({item.creatives.length})
              </button>
              {!isEnded && !isActive ? (
                <button className="chip active" type="button" disabled={!canActivate} title={!canActivate ? readinessBlockers.join("; ") : ""} onClick={() => setCampaignStatus(item, "active")}>
                  {item.status === "paused" ? "Retomar campanha" : "Colocar no ar"}
                </button>
              ) : null}
              {isActive ? <button className="chip" type="button" onClick={() => setCampaignStatus(item, "paused")}>Pausar campanha</button> : null}
              {!isEnded ? <button className="chip" type="button" onClick={() => setConfirmEndCampaign(item)}>Encerrar</button> : null}
              <button className="chip" type="button" onClick={() => duplicateCampaign(item)}>Duplicar</button>
            </div>
          </article>
          );
        })}
      </div>
      {!isLoading && filteredCampaigns.length === 0 ? <p className="empty">Nenhuma campanha encontrada neste filtro.</p> : null}

      <section className="ads-manual-admin-panel clean-card">
        <div className="ads-manual-admin-heading">
          <div>
            <span className="eyebrow">Ferramenta interna</span>
            <strong>Criar campanha interna</strong>
            <p className="meta-line">Use apenas para campanhas 77Gira, correções operacionais ou exceções aprovadas. O fluxo comercial começa no workspace do anunciante.</p>
          </div>
          <button type="button" className="chip" onClick={() => setShowManualCampaignForm((current) => !current)}>
            {showManualCampaignForm ? "Ocultar formulário" : "Criar campanha"}
          </button>
        </div>
        {showManualCampaignForm ? (
          <form className="venue-form ads-manual-admin-form" onSubmit={handleCreateCampaign}>
            <h3 className="section-title">Nova campanha manual</h3>
            <input placeholder="Anunciante" value={campaignForm.advertiser} onChange={(e) => setCampaignForm((prev) => ({ ...prev, advertiser: e.target.value }))} required />
            <input placeholder="Nome da campanha" value={campaignForm.name} onChange={(e) => setCampaignForm((prev) => ({ ...prev, name: e.target.value }))} required />
            <div className="form-actions-inline">
              <input type="datetime-local" value={campaignForm.startsAt} onChange={(e) => setCampaignForm((prev) => ({ ...prev, startsAt: e.target.value }))} />
              <input type="datetime-local" value={campaignForm.endsAt} onChange={(e) => setCampaignForm((prev) => ({ ...prev, endsAt: e.target.value }))} />
            </div>
            <div className="form-actions-inline">
              <select value={campaignForm.status} onChange={(e) => setCampaignForm((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="draft">Rascunho</option><option value="active">Ativa</option><option value="paused">Pausada</option><option value="ended">Encerrada</option>
              </select>
              <input type="number" min="1" max="10" value={campaignForm.priority} onChange={(e) => setCampaignForm((prev) => ({ ...prev, priority: Number(e.target.value || 1) }))} />
            </div>
            <label className="meta-line"><input type="checkbox" checked={campaignForm.runInAllSlots} onChange={(e) => setCampaignForm((prev) => ({ ...prev, runInAllSlots: e.target.checked }))} /> Rodar em todos os slots</label>
            <label className="meta-line"><input type="checkbox" checked={campaignForm.isEnabled} onChange={(e) => setCampaignForm((prev) => ({ ...prev, isEnabled: e.target.checked }))} /> Campanha habilitada</label>
            <button className="btn-primary" type="submit" disabled={createCampaign.isPending}>{createCampaign.isPending ? "Criando..." : "Criar campanha"}</button>
          </form>
        ) : null}
      </section>
      </>
      ) : null}

      {selectedCampaignCreatives ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedCampaignCreatives(null)}>
          <div className="modal-card ads-campaign-creatives-modal" role="dialog" aria-modal="true" aria-labelledby="campaign-creatives-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="advertiser-readonly-title">
              <div><h3 id="campaign-creatives-title">Criativos de {selectedCampaignCreatives.name}</h3><p className="meta-line">Arquivos vinculados à campanha e seus respectivos touchpoints.</p></div>
              <button className="chip" type="button" onClick={() => setSelectedCampaignCreatives(null)}>Fechar</button>
            </div>
            <div className="ads-campaign-creatives-modal-grid">
              {selectedCampaignCreatives.creatives.map((creative) => (
                <article key={creative.id} className="ads-campaign-creative-detail">
                  <div className="ads-review-asset" style={{ "--ads-review-aspect": SLOT_ASPECT_RATIOS[creative.slot] || "58 / 35" }}>
                    {creative.imageUrl ? <img src={creative.imageUrl} alt={creative.altText || creative.title || SLOT_LABELS[creative.slot] || creative.slot} /> : <span>Arquivo indisponível</span>}
                  </div>
                  <strong>{creative.title || "Criativo sem título"}</strong>
                  <small>{SLOT_LABELS[creative.slot] || creative.slot} · {creative.reviewStatus || "sem revisão"}</small>
                </article>
              ))}
            </div>
            {selectedCampaignCreatives.creatives.length === 0 ? <p className="empty">Esta campanha ainda não possui criativos.</p> : null}
          </div>
        </div>
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


