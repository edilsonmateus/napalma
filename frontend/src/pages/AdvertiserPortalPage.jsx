import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  allocateMyWalletCredits,
  createMyAdvertiserCampaign,
  createMyAdvertiserCreative,
  createMyPaymentOrder,
  deleteMyAdvertiserCampaign,
  duplicateMyAdvertiserCampaign,
  endMyAdvertiserCampaign,
  getMyAdvertiserAccessRequests,
  getMyAdvertiserAccounts,
  getMyAdvertiserCampaigns,
  getMyAdvertiserWallet,
  requestMyAdvertiserAccess,
  submitMyAdvertiserReview,
  setMyAdvertiserCampaignLifecycle,
  updateMyAdvertiserCampaign,
  uploadMyAdvertiserCreative
} from "../services/advertiserPortal.service";
import { useAuthStore } from "../store/authStore";

const WRITERS = ["owner", "admin", "campaign_manager"];
const BILLING_ROLES = ["owner", "admin", "billing_manager"];
const CREDITS_PURCHASE_ENABLED = String(import.meta.env.VITE_ADS_CREDITS_PURCHASE_ENABLED || "").toLowerCase() === "true";
const REQUEST_DRAFT_KEY = "77gira.ads.advertiserRequestDraft";

const ACCOUNT_TYPES = [["brand", "Marca"], ["venue", "Casa"], ["producer", "Produtor"], ["artist", "Artista"], ["agency", "Agência"], ["group", "Grupo"], ["unclassified", "Outro"]];
const OBJECTIVES = [["brand_campaign", "Campanha de marca"], ["boost_event", "Impulsionar evento"], ["boost_venue", "Impulsionar casa"], ["agency", "Gerenciar campanhas de clientes"], ["other", "Outro objetivo"]];
const INITIAL_REQUEST = { name: "", type: "brand", legalName: "", contactEmail: "", contactPhone: "", objective: "brand_campaign", message: "" };
const INITIAL_CAMPAIGN = { advertiser: "", name: "", startsAt: "", endsAt: "", objective: "brand_campaign" };
const INITIAL_CREATIVE = { slot: "explore_feed_large", title: "", destinationUrl: "", altText: "", asset: null };

const SLOT_CATALOG = [
  {
    id: "explore_feed_large",
    name: "Explorar · destaque",
    area: "Explorar",
    touchpoint: "Banner rotativo no feed",
    ratio: "58 / 35",
    dimensions: "Foto 580 × 350 px · card final 580 × 455 px",
    maxMb: 5,
    description: "Destaque visual entre casas e eventos que o público está descobrindo.",
    cta: "Ver destaque"
  },
  {
    id: "venue_detail_inline",
    name: "Página da casa",
    area: "Perfil da casa",
    touchpoint: "Banner contextual",
    ratio: "29 / 12",
    dimensions: "Banner 580 × 240 px",
    maxMb: 5,
    description: "Mensagem contextual dentro da página de uma casa de show.",
    cta: "Conhecer"
  },
  {
    id: "radar_header",
    name: "Meu Radar",
    area: "Radar",
    touchpoint: "Banner de planejamento",
    ratio: "290 / 129",
    dimensions: "Foto 580 × 258 px · card final 580 × 350 px",
    maxMb: 5,
    description: "Destaque compacto no espaço de planejamento do público.",
    cta: "Abrir"
  }
];

const STATUS_LABELS = {
  draft: "Rascunho", pending_review: "Em revisão", approved: "Aprovado", rejected: "Rejeitado",
  changes_requested: "Ajustes solicitados", active: "No ar", paused: "Pausado", ended: "Encerrado",
  created: "Criado", pending: "Pendente", cancelled: "Cancelado", expired: "Expirado", refunded: "Estornado"
};

function labelFor(items, value, fallback = "Outro") { return items.find(([key]) => key === value)?.[1] || fallback; }
function formatDate(value) {
  if (!value) return "Sem data definida";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function readRequestDraft(email = "") {
  try { return { ...INITIAL_REQUEST, ...(JSON.parse(localStorage.getItem(REQUEST_DRAFT_KEY) || "{}")), contactEmail: JSON.parse(localStorage.getItem(REQUEST_DRAFT_KEY) || "{}").contactEmail || email }; }
  catch { return { ...INITIAL_REQUEST, contactEmail: email }; }
}
function workspaceArea(pathname) {
  if (pathname.endsWith("/novo-anuncio")) return "new";
  if (pathname.endsWith("/carteira")) return "wallet";
  return "campaigns";
}
function campaignState(campaign) {
  const creatives = campaign.creatives || [];
  const approvedCreative = creatives.some((item) => item.reviewStatus === "approved");
  const hasBudget = Number(campaign.budgetCredits || 0) > 0;
  if (campaign.status === "ended") return { key: "ended", label: "Encerrado", current: 4 };
  if (campaign.status === "paused") return { key: "paused", label: "Pausado", current: 4 };
  if (campaign.status === "active" && campaign.isEnabled && approvedCreative && hasBudget) return { key: "active", label: "No ar", current: 4 };
  if (campaign.reviewStatus === "rejected" || campaign.reviewStatus === "changes_requested") return { key: "rejected", label: "Ajustes necessários", current: 3 };
  if (campaign.reviewStatus === "pending_review" || creatives.some((item) => item.reviewStatus === "pending_review")) return { key: "pending_review", label: "Em revisão", current: 3 };
  if (!creatives.length) return { key: "awaiting_creative", label: "Aguardando criativo", current: 1 };
  if (campaign.reviewStatus === "approved" && approvedCreative && !hasBudget) return { key: "approved", label: "Aguardando patacos", current: 3 };
  if (campaign.reviewStatus === "approved" && approvedCreative) return { key: "approved", label: "Pronta para ativação", current: 4 };
  return { key: "draft", label: "Rascunho", current: 2 };
}

function SlotSurface({ slot, selected, disabled, creative, onSelect }) {
  const image = creative?.imageUrl || "";
  const title = creative?.title || "Seu anúncio";
  return (
    <button type="button" className={`ads-slot-surface ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}`} onClick={() => !disabled && onSelect(slot.id)} disabled={disabled}>
      <div className="ads-slot-surface-meta"><span>{slot.area}</span>{selected ? <b>Selecionado</b> : null}</div>
      <div className={`ads-slot-device ads-slot-device-${slot.id}`}>
        <div className="ads-slot-appbar"><i /> <strong>77gira</strong><em>•••</em></div>
        {slot.id === "explore_feed_large" ? <><div className="ads-slot-placeholder-line" /><article className="ads-explore-preview-card"><div className="ads-explore-preview-image">{image ? <img src={image} alt="Prévia do criativo" /> : <span>Seu criativo</span>}<b>ADS</b></div><div className="ads-explore-preview-copy"><strong>{title}</strong><small>Conteúdo patrocinado no Explorar</small><em>Ver destaque</em></div></article><div className="ads-slot-feed-lines"><i /><i /></div></> : null}
        {slot.id === "venue_detail_inline" ? <><div className="ads-slot-venue-hero" /><div className="ads-slot-feed-lines"><i /><i /></div><div className="ads-slot-ad" style={{ aspectRatio: slot.ratio }}>{image ? <img src={image} alt="Prévia do criativo" /> : <span>Seu criativo</span>}</div></> : null}
        {slot.id === "radar_header" ? <><div className="ads-slot-ad" style={{ aspectRatio: slot.ratio }}>{image ? <img src={image} alt="Prévia do criativo" /> : <span>Seu criativo</span>}</div><div className="ads-slot-radar-list"><i /><i /><i /></div></> : null}
      </div>
      <div className="ads-slot-surface-copy"><strong>{slot.name}</strong><small>{slot.touchpoint} · {slot.dimensions}</small></div>
    </button>
  );
}

export default function AdvertiserPortalPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const area = workspaceArea(location.pathname);
  const [accounts, setAccounts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [data, setData] = useState({ items: [], membership: null });
  const [wallet, setWallet] = useState({ balance: 0, entries: [], orders: [], packages: [], runtime: null });
  const [requestForm, setRequestForm] = useState(() => readRequestDraft(user?.email));
  const [campaignForm, setCampaignForm] = useState(INITIAL_CAMPAIGN);
  const [creative, setCreative] = useState(INITIAL_CREATIVE);
  const [creativePreviewUrl, setCreativePreviewUrl] = useState("");
  const [wizardStep, setWizardStep] = useState("objective");
  const [wizardCampaignId, setWizardCampaignId] = useState("");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [campaignQuery, setCampaignQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [busy, setBusy] = useState(false);

  const selectedAccount = accounts.find((item) => item.id === accountId);
  const campaigns = data.items || [];
  const canWrite = WRITERS.includes(data.membership?.role);
  const canBill = BILLING_ROLES.includes(data.membership?.role);
  const wizardCampaign = campaigns.find((item) => item.id === wizardCampaignId);
  const selectedSlotItems = SLOT_CATALOG.filter((item) => selectedSlots.includes(item.id));
  const filteredCampaigns = campaigns.filter((item) => {
    const state = campaignState(item);
    const text = `${item.name} ${item.advertiser}`.toLowerCase();
    return (!campaignQuery || text.includes(campaignQuery.toLowerCase())) && (statusFilter === "all" || state.key === statusFilter);
  });

  function showMessage(text, type = "info") { setMessage(text); setMessageType(type); }
  function openArea(next) { navigate(`/workspace/anunciante/${next === "new" ? "novo-anuncio" : next === "wallet" ? "carteira" : "campanhas"}`); }
  function goWizardStep(step, campaignId = wizardCampaignId) {
    const currentCampaign = campaigns.find((item) => item.id === campaignId);
    if (step === "review" && Number(currentCampaign?.budgetCredits || 0) <= 0) {
      if (Number(wallet.balance || 0) > 0) {
        void continueFromBudget();
      } else {
        showMessage("Adquira patacos ou use o saldo da carteira antes de enviar para revisão.", "warning");
      }
      return;
    }
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (campaignId) params.set("campaignId", campaignId);
    params.set("step", step);
    setWizardStep(step);
    navigate(`/workspace/anunciante/novo-anuncio?${params.toString()}`, { replace: true });
  }

  async function loadAccounts() {
    try {
      const [items, pending] = await Promise.all([getMyAdvertiserAccounts(), getMyAdvertiserAccessRequests()]);
      setAccounts(items); setRequests(pending);
      const requested = searchParams.get("accountId");
      const active = items.find((item) => item.id === requested) || items[0];
      if (active) setAccountId((current) => current || active.id);
    } catch (error) { showMessage(error?.response?.data?.message || "Não foi possível carregar suas contas anunciantes.", "error"); }
  }
  async function loadCampaigns(id = accountId) {
    if (!id) return;
    try { setData(await getMyAdvertiserCampaigns(id)); }
    catch (error) { showMessage(error?.response?.data?.message || "Não foi possível carregar campanhas.", "error"); }
  }
  async function loadWallet(id = accountId) {
    if (!id || !CREDITS_PURCHASE_ENABLED) return;
    try { const response = await getMyAdvertiserWallet(id); setWallet(response.item); }
    catch (error) { showMessage(error?.response?.data?.message || "Não foi possível carregar a carteira.", "error"); }
  }

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { loadCampaigns(accountId); loadWallet(accountId); }, [accountId]);
  useEffect(() => {
    if (!creative.asset) { setCreativePreviewUrl(""); return undefined; }
    const nextUrl = URL.createObjectURL(creative.asset); setCreativePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [creative.asset]);
  useEffect(() => {
    try { localStorage.setItem(REQUEST_DRAFT_KEY, JSON.stringify(requestForm)); } catch { /* no-op */ }
  }, [requestForm]);
  useEffect(() => {
    const returnedCampaign = searchParams.get("campaignId");
    const status = searchParams.get("payment");
    if (returnedCampaign) setWizardCampaignId(returnedCampaign);
    const routeStep = searchParams.get("step");
    if (["objective", "placement", "budget", "review"].includes(routeStep)) setWizardStep(routeStep);
    if (status) {
      showMessage(status === "approved" ? "Patacos confirmados. O orçamento da campanha foi atualizado." : "A simulação terminou sem alterar o saldo.", status === "approved" ? "success" : "warning");
      loadCampaigns(accountId); loadWallet(accountId);
    }
  }, [searchParams]);
  useEffect(() => {
    const routeCampaignId = searchParams.get("campaignId");
    const current = campaigns.find((item) => item.id === routeCampaignId);
    if (!current) return;
    setWizardCampaignId(current.id);
    setCampaignForm({
      advertiser: current.advertiser || "",
      name: current.name || "",
      startsAt: current.startsAt ? new Date(current.startsAt).toISOString().slice(0, 16) : "",
      endsAt: current.endsAt ? new Date(current.endsAt).toISOString().slice(0, 16) : "",
      objective: current.targeting?.objective || "brand_campaign"
    });
    setSelectedSlots(current.targeting?.slots?.length ? current.targeting.slots : [...new Set((current.creatives || []).map((item) => item.slot))]);
  }, [campaigns, searchParams]);

  async function submitAccess(event) {
    event.preventDefault(); setBusy(true);
    try {
      await requestMyAdvertiserAccess(requestForm);
      showMessage("Solicitação enviada. A equipe 77Gira analisará o acesso comercial.", "success");
      try { localStorage.removeItem(REQUEST_DRAFT_KEY); } catch { /* no-op */ }
      await loadAccounts();
    } catch (error) { showMessage(error?.response?.data?.message || "Não foi possível enviar a solicitação.", "error"); }
    finally { setBusy(false); }
  }

  function beginWizard(existing = null) {
    const intentObjective = searchParams.get("objective") || "brand_campaign";
    setWizardCampaignId(existing?.id || "");
    setCampaignForm(existing ? {
      advertiser: existing.advertiser || "", name: existing.name || "", startsAt: existing.startsAt ? new Date(existing.startsAt).toISOString().slice(0, 16) : "", endsAt: existing.endsAt ? new Date(existing.endsAt).toISOString().slice(0, 16) : "", objective: existing.targeting?.objective || "brand_campaign"
    } : { ...INITIAL_CAMPAIGN, advertiser: selectedAccount?.name || "", objective: intentObjective });
    setSelectedSlots(existing ? [...new Set((existing.creatives || []).map((item) => item.slot))] : []);
    setCreative(INITIAL_CREATIVE);
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (existing?.id) params.set("campaignId", existing.id);
    params.set("step", "objective");
    setWizardStep("objective");
    navigate(`/workspace/anunciante/novo-anuncio?${params.toString()}`);
  }

  async function saveObjective(event) {
    event.preventDefault();
    if (!campaignForm.advertiser.trim() || !campaignForm.name.trim()) return showMessage("Informe o anunciante e o nome da campanha para continuar.", "warning");
    setBusy(true);
    const payload = {
      advertiser: campaignForm.advertiser, name: campaignForm.name,
      startsAt: campaignForm.startsAt ? new Date(campaignForm.startsAt).toISOString() : null,
      endsAt: campaignForm.endsAt ? new Date(campaignForm.endsAt).toISOString() : null,
      runInAllSlots: selectedSlots.length === SLOT_CATALOG.length,
      targeting: { objective: campaignForm.objective, slots: selectedSlots }
    };
    try {
      const item = wizardCampaignId ? await updateMyAdvertiserCampaign(wizardCampaignId, payload) : await createMyAdvertiserCampaign(accountId, payload);
      setWizardCampaignId(item.id); await loadCampaigns(); goWizardStep("placement", item.id);
      showMessage("Rascunho salvo. Agora escolha onde sua campanha aparecerá.", "success");
    } catch (error) { showMessage(error?.response?.data?.message || "Não foi possível salvar o rascunho.", "error"); }
    finally { setBusy(false); }
  }

  function toggleSlot(slotId) { setSelectedSlots((items) => items.includes(slotId) ? items.filter((item) => item !== slotId) : [...items, slotId]); }
  async function uploadCreative(event) {
    event.preventDefault();
    if (!wizardCampaignId || !creative.asset || !selectedSlots.includes(creative.slot)) return showMessage("Escolha um posicionamento selecionado e o arquivo correspondente.", "warning");
    setBusy(true);
    try {
      const asset = await uploadMyAdvertiserCreative({ file: creative.asset, campaignId: wizardCampaignId, slot: creative.slot });
      const imageUrl = asset.publicUrl || asset.url;
      if (!imageUrl) throw new Error("O envio da imagem foi concluído sem uma URL pública. Tente novamente.");
      await createMyAdvertiserCreative(wizardCampaignId, { slot: creative.slot, title: creative.title || null, destinationUrl: creative.destinationUrl || null, altText: creative.altText || null, imageUrl, width: asset.width, height: asset.height, storageProvider: asset.storageProvider, storageKey: asset.storageKey, mimeType: asset.mimeType, fileSizeBytes: asset.fileSizeBytes, checksum: asset.checksum, assetVersion: asset.assetVersion });
      await updateMyAdvertiserCampaign(wizardCampaignId, {
        runInAllSlots: selectedSlots.length === SLOT_CATALOG.length,
        targeting: { objective: campaignForm.objective, slots: selectedSlots }
      });
      const refreshed = await getMyAdvertiserCampaigns(accountId);
      setData(refreshed);
      setCreative((current) => ({ ...INITIAL_CREATIVE, slot: current.slot }));
      const refreshedCampaign = refreshed.items?.find((item) => item.id === wizardCampaignId);
      const completedAllSlots = selectedSlots.length && selectedSlots.every((slot) => refreshedCampaign?.creatives?.some((creativeItem) => creativeItem.slot === slot));
      if (completedAllSlots) {
        showMessage("Criativos salvos. Você avançou para o orçamento da campanha.", "success");
        goWizardStep("budget", wizardCampaignId);
      } else {
        showMessage("Criativo salvo. Envie os arquivos restantes para continuar.", "success");
      }
    } catch (error) { showMessage(error?.response?.data?.message || "Não foi possível enviar o criativo.", "error"); }
    finally { setBusy(false); }
  }
  async function continueFromPlacement() {
    const current = campaigns.find((item) => item.id === wizardCampaignId);
    const complete = selectedSlots.length && selectedSlots.every((slot) => current?.creatives?.some((creativeItem) => creativeItem.slot === slot));
    if (!complete) return showMessage("Envie pelo menos um criativo para cada posicionamento escolhido.", "warning");
    setBusy(true);
    try {
      await updateMyAdvertiserCampaign(wizardCampaignId, {
        runInAllSlots: selectedSlots.length === SLOT_CATALOG.length,
        targeting: { objective: campaignForm.objective, slots: selectedSlots }
      });
      await loadCampaigns();
      goWizardStep("budget", wizardCampaignId);
    } catch (error) { showMessage(error?.response?.data?.message || "Não foi possível salvar os posicionamentos.", "error"); }
    finally { setBusy(false); }
  }
  async function startPayment(packageCode, campaignId = wizardCampaignId) {
    if (!accountId || !canBill) return showMessage("Seu papel não permite adquirir patacos nesta conta.", "warning");
    setBusy(true);
    try {
      const returnPath = `/workspace/anunciante/novo-anuncio?accountId=${encodeURIComponent(accountId)}&campaignId=${encodeURIComponent(campaignId || "")}&step=budget`;
      const response = await createMyPaymentOrder(accountId, { packageCode, campaignId: campaignId || null, returnPath });
      navigate(response.checkoutPath);
    } catch (error) { showMessage(error?.response?.data?.message || "Não foi possível abrir a simulação de compra.", "error"); setBusy(false); }
  }
  async function continueFromBudget() {
    const campaign = campaigns.find((item) => item.id === wizardCampaignId);
    if (!campaign) return showMessage("Não foi possível localizar a campanha para receber os patacos.", "error");
    if (Number(campaign.budgetCredits || 0) > 0) return goWizardStep("review", campaign.id);
    if (Number(wallet.balance || 0) <= 0) return showMessage("Adquira patacos ou use o saldo da carteira antes de enviar para revisão.", "warning");
    setBusy(true);
    try {
      await allocateMyWalletCredits(accountId, { campaignId: campaign.id, amount: Number(wallet.balance) });
      await Promise.all([loadCampaigns(accountId), loadWallet(accountId)]);
      showMessage(`${wallet.balance} patacos foram vinculados à campanha.`, "success");
      const params = new URLSearchParams();
      if (accountId) params.set("accountId", accountId);
      params.set("campaignId", campaign.id);
      params.set("step", "review");
      setWizardStep("review");
      navigate(`/workspace/anunciante/novo-anuncio?${params.toString()}`, { replace: true });
    } catch (error) { showMessage(error?.response?.data?.message || "Não foi possível vincular os patacos à campanha.", "error"); }
    finally { setBusy(false); }
  }

  async function submitWizardForReview() {
    const current = campaigns.find((item) => item.id === wizardCampaignId);
    if (!current) return;
    setBusy(true);
    try {
      for (const item of current.creatives || []) if (["draft", "rejected", "changes_requested"].includes(item.reviewStatus || "draft")) await submitMyAdvertiserReview("creative", item.id);
      await submitMyAdvertiserReview("campaign", current.id);
      showMessage("Campanha e criativos enviados para revisão 77Gira.", "success"); await loadCampaigns(); openArea("campaigns");
    } catch (error) { showMessage(error?.response?.data?.message || "Não foi possível enviar a campanha para revisão.", "error"); }
    finally { setBusy(false); }
  }
  async function removeOrEnd(item) {
    const state = campaignState(item);
    const isDraft = item.status === "draft" && ["draft", "pending_review", "rejected", "changes_requested"].includes(item.reviewStatus || "draft");
    const action = isDraft ? "excluir" : "encerrar";
    if (!window.confirm(`Deseja ${action} “${item.name}”? ${isDraft ? "O rascunho e seus criativos serão removidos." : "O histórico será preservado e a veiculação será interrompida."}`)) return;
    setBusy(true);
    try { if (isDraft) await deleteMyAdvertiserCampaign(item.id); else await endMyAdvertiserCampaign(item.id); await loadCampaigns(); showMessage(isDraft ? "Rascunho excluído." : "Campanha encerrada e preservada no histórico.", "success"); }
    catch (error) { showMessage(error?.response?.data?.message || `Não foi possível ${action} esta campanha.`, "error"); }
    finally { setBusy(false); }
  }
  async function duplicateCampaign(item) {
    setBusy(true);
    try { await duplicateMyAdvertiserCampaign(item.id); await loadCampaigns(); showMessage("Campanha duplicada como rascunho. Revise antes de enviar.", "success"); }
    catch (error) { showMessage(error?.response?.data?.message || "Não foi possível duplicar esta campanha.", "error"); }
    finally { setBusy(false); }
  }
  async function changeLifecycle(item) {
    const nextStatus = item.status === "active" ? "paused" : "active";
    setBusy(true);
    try { await setMyAdvertiserCampaignLifecycle(item.id, nextStatus); await loadCampaigns(); showMessage(nextStatus === "paused" ? "Campanha pausada." : "Campanha retomada.", "success"); }
    catch (error) { showMessage(error?.response?.data?.message || "Não foi possível alterar a veiculação.", "error"); }
    finally { setBusy(false); }
  }

  const wizardSteps = [
    ["objective", "Objetivo", "Quem, o quê e quando"], ["placement", "Posição", "Onde o anúncio aparece"],
    ["budget", "Orçamento", "Patacos e carteira"], ["review", "Revisão", "Conferir e enviar"]
  ];

  return (
    <section className="ads-workspace-v2">
      <header className="ads-workspace-v2-header">
        <div><img src="/logoads77gira.svg" alt="77Gira Ads" /><h1>Workspace do anunciante</h1><p>Planeje, publique e acompanhe campanhas em uma operação controlada.</p></div>
        <Link to="/anunciar" className="chip">Como funciona</Link>
      </header>
      {message ? <p className={`ads-workspace-message ${messageType}`}>{message}</p> : null}

      {!accounts.length ? (
        <section className="ads-access-grid">
          <article className="ads-access-intro"><span>ACESSO COMERCIAL</span><h2>Publicidade com contexto, revisão e controle.</h2><p>O workspace é liberado para marcas, casas, produtores e artistas após validação comercial da equipe 77Gira.</p><ol><li>Solicite acesso usando sua conta 77Gira.</li><li>Acompanhe a validação comercial.</li><li>Crie campanhas em um ambiente controlado.</li></ol></article>
          <form className="ads-access-form" onSubmit={submitAccess}>
            <span>NOVA SOLICITAÇÃO</span><h2>{requests.length ? "Solicitação em análise" : "Acesso de anunciante"}</h2>
            {requests.length ? <p>Seu pedido para <b>{requests[0].name}</b> está em {STATUS_LABELS[requests[0].status] || requests[0].status}. Você continuará usando este mesmo login.</p> : <>
              <label>Nome público<input required value={requestForm.name} onChange={(event) => setRequestForm({ ...requestForm, name: event.target.value })} placeholder="Marca, casa ou projeto" /></label>
              <label>Tipo de anunciante<select value={requestForm.type} onChange={(event) => setRequestForm({ ...requestForm, type: event.target.value })}>{ACCOUNT_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
              <label>Objetivo<select value={requestForm.objective} onChange={(event) => setRequestForm({ ...requestForm, objective: event.target.value })}>{OBJECTIVES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
              <label>Resumo da intenção<textarea required minLength={10} rows="5" value={requestForm.message} onChange={(event) => setRequestForm({ ...requestForm, message: event.target.value })} placeholder="O que você pretende anunciar e qual resultado espera?" /></label>
              <button className="btn-primary" disabled={busy}>{busy ? "Enviando..." : "Enviar solicitação"}</button>
            </>}
          </form>
        </section>
      ) : <>
        <section className="ads-workspace-context">
          <div><span>CONTA ATIVA</span><strong>{selectedAccount?.name}</strong><small>{labelFor(ACCOUNT_TYPES, selectedAccount?.type)} · {data.membership?.role || selectedAccount?.membership?.role}</small></div>
          <label>Alternar conta<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.membership.role}</option>)}</select></label>
        </section>
        <nav className="ads-workspace-tabs" aria-label="Áreas do workspace">
          <button type="button" className={area === "campaigns" ? "active" : ""} onClick={() => openArea("campaigns")}><span>01</span>Campanhas</button>
          <button type="button" className={area === "new" ? "active" : ""} onClick={() => beginWizard()}><span>02</span>Novo anúncio</button>
          <button type="button" className={area === "wallet" ? "active" : ""} onClick={() => openArea("wallet")}><span>03</span>Carteira de mídia</button>
        </nav>

        {area === "campaigns" ? <section className="ads-campaigns-area">
          <div className="ads-area-heading"><div><span>OPERAÇÃO</span><h2>Campanhas</h2><p>Veja onde cada campanha está e avance apenas quando o próximo passo fizer sentido.</p></div>{canWrite ? <button className="btn-primary" type="button" onClick={() => beginWizard()}>Novo anúncio</button> : null}</div>
          <div className="ads-campaign-filters"><input placeholder="Buscar campanha ou anunciante" value={campaignQuery} onChange={(event) => setCampaignQuery(event.target.value)} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos os status</option><option value="draft">Rascunhos</option><option value="awaiting_creative">Aguardando criativo</option><option value="pending_review">Em revisão</option><option value="approved">Aprovadas</option><option value="active">No ar</option><option value="ended">Encerradas</option></select></div>
          {!filteredCampaigns.length ? <article className="ads-empty-campaigns"><strong>Nenhuma campanha neste recorte.</strong><p>Crie um anúncio para iniciar um rascunho guiado.</p></article> : <div className="ads-campaign-grid-v2">{filteredCampaigns.map((item) => {
            const state = campaignState(item); const steps = ["Criada", "Criativo", "Revisão", "No ar"];
            return <article key={item.id} className="ads-campaign-card-v2"><header><div><span>{item.advertiser}</span><h3>{item.name}</h3><p>{formatDate(item.startsAt)} → {formatDate(item.endsAt)}</p></div><b className={`ads-stage ${state.key}`}>{state.label}</b></header><div className="ads-progress-v2">{steps.map((label, index) => <span key={label} className={index + 1 <= state.current ? "done" : ""}><i />{label}</span>)}</div><footer><button className="chip" type="button" onClick={() => beginWizard(item)}>Editar</button>{canWrite ? <><button className="chip" type="button" disabled={busy} onClick={() => duplicateCampaign(item)}>Duplicar</button>{["active", "paused"].includes(item.status) ? <button className="chip" type="button" disabled={busy} onClick={() => changeLifecycle(item)}>{item.status === "active" ? "Pausar" : "Retomar"}</button> : null}<button className="chip" type="button" disabled={busy} onClick={() => removeOrEnd(item)}>{item.status === "draft" && ["draft", "pending_review", "rejected", "changes_requested"].includes(item.reviewStatus || "draft") ? "Excluir" : "Encerrar"}</button></> : null}</footer></article>;
          })}</div>}
        </section> : null}

        {area === "new" ? <section className="ads-wizard-v2">
          <div className="ads-area-heading"><div><span>NOVO ANÚNCIO</span><h2>{wizardCampaignId ? "Configure seu rascunho" : "Vamos montar sua campanha"}</h2><p>Uma etapa por vez. Você pode voltar e ajustar o que já foi definido.</p></div><button className="chip" type="button" onClick={() => openArea("campaigns")}>Voltar para campanhas</button></div>
          <ol className="ads-wizard-steps">{wizardSteps.map(([id, title, helper], index) => <li key={id} className={wizardStep === id ? "active" : wizardSteps.findIndex(([key]) => key === wizardStep) > index ? "complete" : ""}><span>{index + 1}</span><div><strong>{title}</strong><small>{helper}</small></div></li>)}</ol>
          <div className="ads-wizard-panel">
            {wizardStep === "objective" ? <form className="ads-wizard-form" onSubmit={saveObjective}><div><span>ETAPA 1</span><h3>Objetivo e período</h3><p>Comece pelo contexto. Nada será publicado neste momento.</p></div><label>Anunciante<input required value={campaignForm.advertiser} onChange={(event) => setCampaignForm({ ...campaignForm, advertiser: event.target.value })} placeholder="Nome exibido no anúncio" /></label><label>Nome da campanha<input required value={campaignForm.name} onChange={(event) => setCampaignForm({ ...campaignForm, name: event.target.value })} placeholder="Ex.: Noite especial de samba" /></label><label>Objetivo<select value={campaignForm.objective} onChange={(event) => setCampaignForm({ ...campaignForm, objective: event.target.value })}>{OBJECTIVES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><div className="ads-two-fields"><label>Início<input type="datetime-local" value={campaignForm.startsAt} onChange={(event) => setCampaignForm({ ...campaignForm, startsAt: event.target.value })} /></label><label>Fim<input type="datetime-local" value={campaignForm.endsAt} onChange={(event) => setCampaignForm({ ...campaignForm, endsAt: event.target.value })} /></label></div><button className="btn-primary" disabled={busy}>{busy ? "Salvando..." : "Salvar e escolher posição"}</button></form> : null}
            {wizardStep === "placement" ? <div className="ads-placement-step"><div><span>ETAPA 2</span><h3>Onde este anúncio aparece?</h3><p>Escolha os posicionamentos antes do upload. Cada espaço usa sua proporção real de exibição.</p></div><div className="ads-slot-carousel">{SLOT_CATALOG.map((slot) => <SlotSurface key={slot.id} slot={slot} selected={selectedSlots.includes(slot.id)} creative={wizardCampaign?.creatives?.find((item) => item.slot === slot.id)} onSelect={toggleSlot} />)}</div><div className="ads-slot-dots">{SLOT_CATALOG.map((slot) => <i key={slot.id} className={selectedSlots.includes(slot.id) ? "active" : ""} />)}</div>{selectedSlotItems.length ? <form className="ads-upload-form" onSubmit={uploadCreative}><div><span>CRIATIVO PARA {labelFor(SLOT_CATALOG.map((item) => [item.id, item.name]), creative.slot)}</span><p>Recomendado: {SLOT_CATALOG.find((item) => item.id === creative.slot)?.dimensions} · máximo 5 MB.</p></div><label>Posicionamento<select value={creative.slot} onChange={(event) => setCreative({ ...creative, slot: event.target.value })}>{selectedSlotItems.map((slot) => <option value={slot.id} key={slot.id}>{slot.name}</option>)}</select></label><label>Arquivo<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCreative({ ...creative, asset: event.target.files?.[0] || null })} /></label><label>Título do anúncio<input value={creative.title} onChange={(event) => setCreative({ ...creative, title: event.target.value })} placeholder="Título visível ou interno" /></label><label>Destino<input type="url" value={creative.destinationUrl} onChange={(event) => setCreative({ ...creative, destinationUrl: event.target.value })} placeholder="https://..." /></label>{creativePreviewUrl ? <div className="ads-upload-preview"><img src={creativePreviewUrl} alt="Prévia local do criativo" /><span>Prévia do arquivo selecionado</span></div> : null}<button className="chip active" type="submit" disabled={busy}>{busy ? "Enviando criativo..." : "Salvar criativo e avançar"}</button></form> : <p className="ads-wizard-hint">Selecione pelo menos um posicionamento para preparar o upload.</p>}<div className="ads-wizard-actions"><button className="chip" type="button" onClick={() => goWizardStep("objective")}>Voltar</button><button className="btn-primary" type="button" disabled={busy} onClick={continueFromPlacement}>Continuar para orçamento</button></div></div> : null}
            {wizardStep === "budget" ? <div className="ads-budget-step"><div><span>ETAPA 3</span><h3>Orçamento de mídia</h3><p>Patacos confirmados ficam vinculados a esta campanha. O gateway abaixo é uma simulação sem cobrança real.</p></div><div className="ads-wallet-inline"><strong>{wallet.balance}</strong><span>patacos livres na carteira</span></div><div className="ads-package-grid">{(wallet.packages?.length ? wallet.packages : [{ code: "test_controlled", name: "Teste controlado", credits: 100 }, { code: "local_boost", name: "Impulso local", credits: 300 }, { code: "presence_campaign", name: "Campanha de presença", credits: 750 }]).map((item) => <article key={item.code}><span>{item.name}</span><strong>{item.credits} patacos</strong><p>Ambiente de simulação. O valor não é cobrado.</p><button className="chip active" disabled={busy || !wallet.runtime?.available || !canBill} type="button" onClick={() => startPayment(item.code)}>{canBill ? "Testar aquisição" : "Sem permissão financeira"}</button></article>)}</div><div className="ads-wizard-actions"><button className="chip" type="button" onClick={() => goWizardStep("placement")}>Voltar</button><button className="btn-primary" type="button" onClick={() => goWizardStep("review")}>Continuar para revisão</button></div></div> : null}
            {wizardStep === "review" ? <div className="ads-review-step"><div><span>ETAPA 4</span><h3>Revise antes de enviar</h3><p>O envio encaminha campanha e criativos para a equipe 77Gira. Não publica automaticamente.</p></div><dl><div><dt>Campanha</dt><dd>{wizardCampaign?.name || campaignForm.name}</dd></div><div><dt>Objetivo</dt><dd>{labelFor(OBJECTIVES, campaignForm.objective)}</dd></div><div><dt>Posições</dt><dd>{selectedSlotItems.map((item) => item.name).join(" · ") || "Nenhuma"}</dd></div><div><dt>Patacos na campanha</dt><dd>{wizardCampaign?.budgetCredits || 0}</dd></div></dl><div className="ads-review-note"><strong>Revisão 77Gira</strong><p>Vamos avaliar adequação, contexto, qualidade e disponibilidade antes de qualquer veiculação.</p></div><div className="ads-wizard-actions"><button className="chip" type="button" onClick={() => goWizardStep("budget")}>Voltar</button><button className="btn-primary" type="button" disabled={busy} onClick={submitWizardForReview}>{busy ? "Enviando..." : "Enviar para revisão"}</button></div></div> : null}
          </div>
        </section> : null}

        {area === "wallet" ? <section className="ads-wallet-v2"><div className="ads-area-heading"><div><span>CARTEIRA DE MÍDIA</span><h2>Patacos e histórico</h2><p>Saldo e operações da conta anunciante em um único lugar.</p></div></div><div className="ads-wallet-kpis"><article><span>Saldo disponível</span><strong>{wallet.balance}</strong><small>Patacos livres para novas campanhas.</small></article><article><span>Em campanhas</span><strong>{campaigns.reduce((sum, item) => sum + Number(item.budgetCredits || 0), 0)}</strong><small>Orçamentos já vinculados a campanhas.</small></article><article><span>Operações</span><strong>{wallet.orders?.length || 0}</strong><small>Pedidos recentes nesta conta.</small></article></div><div className="ads-wallet-layout"><section><h3>Comprar patacos</h3><p>Use a simulação para validar ida, processamento e retorno automático.</p><div className="ads-package-grid">{(wallet.packages?.length ? wallet.packages : [{ code: "test_controlled", name: "Teste controlado", credits: 100 }, { code: "local_boost", name: "Impulso local", credits: 300 }, { code: "presence_campaign", name: "Campanha de presença", credits: 750 }]).map((item) => <article key={item.code}><span>{item.name}</span><strong>{item.credits} patacos</strong><button className="chip active" type="button" disabled={busy || !wallet.runtime?.available || !canBill} onClick={() => startPayment(item.code, null)}>Testar aquisição</button></article>)}</div></section><section className="ads-wallet-history"><h3>Histórico</h3>{wallet.entries?.length ? wallet.entries.map((entry) => <div key={entry.id}><b className={entry.delta >= 0 ? "credit" : "debit"}>{entry.delta >= 0 ? "+" : ""}{entry.delta}</b><p><strong>{entry.description || entry.type}</strong><small>{entry.campaign?.name || "Carteira geral"} · {formatDate(entry.createdAt)}</small></p><span>Saldo {entry.balanceAfter}</span></div>) : <p>Nenhuma movimentação registrada.</p>}</section></div></section> : null}
      </>}
    </section>
  );
}
