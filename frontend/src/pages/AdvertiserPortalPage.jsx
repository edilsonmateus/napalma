import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  createMyAdvertiserCampaign,
  createMyAdvertiserCreative,
  getMyAdvertiserAccessRequests,
  getMyAdvertiserAccounts,
  getMyAdvertiserCampaigns,
  requestMyAdvertiserAccess,
  submitMyAdvertiserReview,
  uploadMyAdvertiserCreative
} from "../services/advertiserPortal.service";
import { useAuthStore } from "../store/authStore";
import AdsMobilePreview from "../components/ads/AdsMobilePreview";

const WRITERS = ["owner", "admin", "campaign_manager"];
const SLOTS = ["explore_feed_large", "venue_detail_inline", "radar_header"];
const ACCOUNT_TYPES = [
  ["brand", "Marca"],
  ["venue", "Casa"],
  ["producer", "Produtor"],
  ["artist", "Artista"],
  ["agency", "Agência"],
  ["group", "Grupo"],
  ["unclassified", "Outro"]
];
const OBJECTIVES = [
  ["brand_campaign", "Campanha de marca"],
  ["boost_event", "Impulsionar evento"],
  ["boost_venue", "Impulsionar casa"],
  ["agency", "Gerenciar campanhas de clientes"],
  ["other", "Outro objetivo"]
];
const SLOT_LABELS = {
  explore_feed_large: "Explorar · destaque",
  venue_detail_inline: "Página da casa",
  radar_header: "Radar"
};
const SLOT_PREVIEW_COPY = {
  explore_feed_large: {
    title: "Explorar",
    description: "Aparece no feed principal, entre casas e eventos recomendados.",
    cta: "Ver destaque"
  },
  venue_detail_inline: {
    title: "Página da casa",
    description: "Aparece como bloco contextual dentro da página de uma casa.",
    cta: "Conhecer"
  },
  radar_header: {
    title: "Meu Radar",
    description: "Aparece como destaque compacto na área de planejamento do usuário.",
    cta: "Abrir"
  }
};
const CREDIT_PACKAGES = [
  {
    name: "Teste controlado",
    credits: "100 patacos",
    description: "Ideal para validar criativo, slot e resposta inicial antes de ampliar a campanha."
  },
  {
    name: "Impulso local",
    credits: "300 patacos",
    description: "Pensado para casas, eventos e artistas que querem aparecer com recorrência moderada."
  },
  {
    name: "Campanha de presença",
    credits: "750 patacos",
    description: "Para marcas, produtoras ou campanhas com mais de um slot e período maior de veiculação."
  }
];

const STATUS_LABELS = {
  draft: "Rascunho",
  pending_review: "Em revisão",
  approved: "Aprovado",
  rejected: "Rejeitado",
  changes_requested: "Ajustes solicitados",
  active: "Ativo",
  paused: "Pausado",
  archived: "Arquivado"
};
const INITIAL_REQUEST = { name: "", type: "brand", legalName: "", contactEmail: "", contactPhone: "", objective: "brand_campaign", message: "" };
const CREDITS_PURCHASE_ENABLED =
  String(import.meta.env.VITE_ADS_CREDITS_PURCHASE_ENABLED || "").toLowerCase() === "true";
const VALID_TYPES = new Set(ACCOUNT_TYPES.map(([value]) => value));
const VALID_OBJECTIVES = new Set(OBJECTIVES.map(([value]) => value));
const REQUEST_DRAFT_KEY = "77gira.ads.advertiserRequestDraft";
const SOURCE_LABELS = {
  event_admin: "evento",
  venues_admin: "casa",
  venue_detail: "casa",
  producer_dashboard: "produtor",
  artist_workspace: "artista",
  artist_profile: "artista",
  artist_epk: "EPK"
};

function readRequestDraft(email = "") {
  try {
    const raw = localStorage.getItem(REQUEST_DRAFT_KEY);
    if (!raw) return { ...INITIAL_REQUEST, contactEmail: email || "" };
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_REQUEST,
      ...parsed,
      type: VALID_TYPES.has(parsed?.type) ? parsed.type : INITIAL_REQUEST.type,
      objective: VALID_OBJECTIVES.has(parsed?.objective) ? parsed.objective : INITIAL_REQUEST.objective,
      contactEmail: parsed?.contactEmail || email || ""
    };
  } catch (_error) {
    return { ...INITIAL_REQUEST, contactEmail: email || "" };
  }
}

function hasMeaningfulRequestDraft(draft) {
  return Boolean(
    draft?.name?.trim()
    || draft?.legalName?.trim()
    || draft?.contactPhone?.trim()
    || draft?.message?.trim()
    || draft?.objective !== INITIAL_REQUEST.objective
    || draft?.type !== INITIAL_REQUEST.type
  );
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "Legado";
}

function formatDate(value) {
  if (!value) return "Sem data";
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch (_error) {
    return "Data inválida";
  }
}

function getAccountTypeLabel(type) {
  return ACCOUNT_TYPES.find(([value]) => value === type)?.[1] || type || "Conta";
}

function getCampaignReadiness(campaignItem) {
  const creatives = campaignItem.creatives || [];
  const approvedCreatives = creatives.filter((item) => ["approved", "active"].includes(item.reviewStatus || item.status));
  const hasCreative = creatives.length > 0;
  const campaignApproved = ["approved", "active"].includes(campaignItem.reviewStatus || campaignItem.status);
  const campaignInReview = campaignItem.reviewStatus === "pending_review";
  const anyCreativeInReview = creatives.some((item) => item.reviewStatus === "pending_review");
  const needsCampaignReview = ["draft", "rejected", "changes_requested"].includes(campaignItem.reviewStatus || "draft");
  const needsCreativeReview = creatives.some((item) => ["draft", "rejected", "changes_requested"].includes(item.reviewStatus || "draft"));
  const hasBudget = CREDITS_PURCHASE_ENABLED && Number(campaignItem.creditBalance || campaignItem.budgetCredits || 0) > 0;

  if (!hasCreative) {
    return { deliveryLabel: "Aguardando criativo", tone: "draft", nextAction: "Envie pelo menos um criativo para que a campanha possa ser revisada.", progress: 25 };
  }
  if (needsCreativeReview) {
    return { deliveryLabel: "Criativo não enviado para revisão", tone: "draft", nextAction: "Envie o criativo para revisão antes de esperar veiculação.", progress: 45 };
  }
  if (campaignInReview || anyCreativeInReview) {
    return { deliveryLabel: "Em revisão 77Gira", tone: "pending_review", nextAction: "Aguarde a análise editorial/comercial da equipe 77Gira.", progress: 65 };
  }
  if (needsCampaignReview) {
    return { deliveryLabel: "Campanha não enviada para revisão", tone: "draft", nextAction: "Envie a campanha para revisão para validar o impulsionamento.", progress: 55 };
  }
  if (!campaignApproved || approvedCreatives.length === 0) {
    return { deliveryLabel: "Aguardando aprovação", tone: "pending_review", nextAction: "A campanha ou os criativos ainda precisam de aprovação.", progress: 70 };
  }
  if (!hasBudget) {
    if (!CREDITS_PURCHASE_ENABLED) {
      return {
        deliveryLabel: "Bloqueada por créditos",
        tone: "draft",
        nextAction: "A compra de patacos ainda não está liberada; a campanha aprovada fica pronta, mas não deve ser tratada como no ar.",
        progress: 82
      };
    }
    return { deliveryLabel: "Aguardando créditos", tone: "draft", nextAction: "Adicione créditos/patacos quando a compra de mídia estiver liberada.", progress: 82 };
  }
  return { deliveryLabel: "Pronta para veicular", tone: "active", nextAction: "Campanha aprovada, com criativo e orçamento disponível.", progress: 100 };
}

function getPrimaryCreative(campaignItem) {
  return (campaignItem.creatives || [])[0] || null;
}

function getCampaignBlockers(campaignItem) {
  const creatives = campaignItem.creatives || [];
  const approvedCreatives = creatives.filter((item) => ["approved", "active"].includes(item.reviewStatus || item.status));
  const hasBudget = CREDITS_PURCHASE_ENABLED && Number(campaignItem.creditBalance || campaignItem.budgetCredits || 0) > 0;
  return [
    {
      label: "Campanha revisada",
      complete: ["approved", "active"].includes(campaignItem.reviewStatus || campaignItem.status),
      help: "A equipe 77Gira precisa aprovar objetivo, período e contexto."
    },
    {
      label: "Criativo aprovado",
      complete: approvedCreatives.length > 0,
      help: creatives.length ? "O arquivo existe, mas ainda precisa passar pela revisão." : "Envie pelo menos uma imagem para o slot escolhido."
    },
    {
      label: "Patacos/créditos",
      complete: hasBudget,
      help: CREDITS_PURCHASE_ENABLED
        ? "Compre ou vincule créditos de impulsionamento."
        : "Camada financeira ainda não liberada; veiculação comercial fica bloqueada."
    },
    {
      label: "Inventário compatível",
      complete: campaignItem.runInAllSlots || approvedCreatives.some((creative) => SLOTS.includes(creative.slot)),
      help: "O criativo precisa estar ligado a um slot existente do app."
    }
  ];
}

function getCampaignPreviewSlots(campaignItem, liveCreative = {}) {
  if (campaignItem.runInAllSlots) return SLOTS;
  const persistedSlots = [...new Set((campaignItem.creatives || []).map((creativeItem) => creativeItem.slot).filter(Boolean))];
  if (liveCreative.slot) return [liveCreative.slot];
  if (persistedSlots.length) return persistedSlots;
  return [SLOTS[0]];
}

function getAdvertiserCampaignState(campaignItem) {
  const readiness = getCampaignReadiness(campaignItem);
  const creatives = campaignItem.creatives || [];
  const draftCreative = creatives.find((item) => ["draft", "rejected", "changes_requested"].includes(item.reviewStatus || "draft"));
  const hasApprovedCampaign = ["approved", "active"].includes(campaignItem.reviewStatus || campaignItem.status);
  const hasApprovedCreative = creatives.some((item) => ["approved", "active"].includes(item.reviewStatus || item.status));
  let actionType = "wait";
  let actionLabel = "Acompanhar status";
  let actionHelp = readiness.nextAction;

  if (!creatives.length) {
    actionType = "prepare_creative";
    actionLabel = "Preparar criativo";
    actionHelp = "Vincule uma imagem a esta campanha para liberar a etapa de revisão.";
  } else if (draftCreative) {
    actionType = "submit_creative";
    actionLabel = "Enviar criativo para revisão";
    actionHelp = "O criativo já existe, mas ainda precisa ser enviado para análise 77Gira.";
  } else if (["draft", "rejected", "changes_requested"].includes(campaignItem.reviewStatus || "draft")) {
    actionType = "submit_campaign";
    actionLabel = "Enviar campanha para revisão";
    actionHelp = "Os criativos já foram encaminhados; falta validar a campanha.";
  } else if (readiness.deliveryLabel === "Aguardando créditos") {
    actionType = "credits";
    actionLabel = "Adicionar créditos";
    actionHelp = "A etapa de compra será conectada aos patacos/créditos de impulsionamento.";
  } else if (hasApprovedCampaign && hasApprovedCreative) {
    actionType = "ready";
    actionLabel = "Pronta para veiculação";
    actionHelp = "Aguardando regra operacional de créditos/ativação.";
  }

  return {
    ...readiness,
    actionType,
    actionLabel,
    actionHelp,
    draftCreativeId: draftCreative?.id,
    steps: [
      { label: "Rascunho", complete: true },
      { label: "Criativo", complete: creatives.length > 0 },
      { label: "Revisão", complete: hasApprovedCampaign && hasApprovedCreative, current: ["pending_review", "approved"].includes(campaignItem.reviewStatus) && !hasApprovedCampaign },
      { label: "Créditos", complete: Number(campaignItem.creditBalance || campaignItem.budgetCredits || 0) > 0, current: readiness.deliveryLabel === "Aguardando créditos" },
      { label: "No ar", complete: readiness.deliveryLabel === "Pronta para veicular" }
    ]
  };
}

function getWorkspaceStage(campaigns) {
  if (!campaigns.length) {
    return {
      title: "Comece pelo rascunho",
      description: "Crie uma campanha com objetivo, período e contexto. Nada será publicado sem revisão 77Gira.",
      activeStep: "draft"
    };
  }
  const states = campaigns.map((item) => getAdvertiserCampaignState(item));
  if (states.some((item) => item.actionType === "prepare_creative")) {
    return {
      title: "Agora falta o criativo",
      description: "A campanha já existe. Envie uma imagem e confira a prévia mobile antes de mandar para revisão.",
      activeStep: "creative"
    };
  }
  if (states.some((item) => item.actionType === "submit_creative" || item.actionType === "submit_campaign")) {
    return {
      title: "Envie para revisão",
      description: "Campanha e criativo precisam passar pela análise editorial/comercial da equipe 77Gira.",
      activeStep: "review"
    };
  }
  if (states.some((item) => item.actionType === "credits" || item.actionType === "ready")) {
    return {
      title: "Créditos são o próximo bloqueio",
      description: "A estrutura da campanha já está madura; a etapa de compra de patacos ainda será conectada.",
      activeStep: "credits"
    };
  }
  return {
    title: "Acompanhe a análise",
    description: "Existem itens em validação. Quando a revisão terminar, o workspace indicará o próximo passo.",
    activeStep: "review"
  };
}

function getObjectiveLabel(objective) {
  return OBJECTIVES.find(([value]) => value === objective)?.[1] || "Campanha";
}

function readAdvertiserIntent(searchParams) {
  const source = searchParams.get("source") || "";
  if (!source) return null;
  const type = searchParams.get("type") || "";
  const objective = searchParams.get("objective") || "";
  const name = searchParams.get("name") || "";
  const accountName = searchParams.get("accountName") || name;
  const campaignName = searchParams.get("campaignName") || name;
  const message = searchParams.get("message") || "";
  return {
    source,
    sourceLabel: SOURCE_LABELS[source] || "contexto",
    type: VALID_TYPES.has(type) ? type : "unclassified",
    objective: VALID_OBJECTIVES.has(objective) ? objective : "other",
    name,
    accountName,
    campaignName,
    message
  };
}

export default function AdvertiserPortalPage() {
  const user = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [data, setData] = useState({ items: [], membership: null });
  const [campaign, setCampaign] = useState({ advertiser: "", name: "", startsAt: "", endsAt: "", runInAllSlots: false });
  const [creative, setCreative] = useState({ campaignId: "", slot: SLOTS[0], title: "", destinationUrl: "", altText: "", asset: null });
  const [creativePreviewUrl, setCreativePreviewUrl] = useState("");
  const [requestForm, setRequestForm] = useState(() => readRequestDraft(user?.email));
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [receipt, setReceipt] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const advertiserIntent = useMemo(() => readAdvertiserIntent(searchParams), [searchParams]);
  const selectedAccount = useMemo(() => accounts.find((item) => item.id === accountId), [accountId, accounts]);
  const canWrite = WRITERS.includes(data.membership?.role);
  const hasPendingRequest = requests.length > 0;
  const pendingRequest = requests[0];
  const campaigns = data.items || [];
  const creativeCount = campaigns.reduce((total, item) => total + (item.creatives?.length || 0), 0);
  const pendingReviewCount = campaigns.filter((item) => item.reviewStatus === "pending_review").length
    + campaigns.reduce((total, item) => total + (item.creatives || []).filter((creativeItem) => creativeItem.reviewStatus === "pending_review").length, 0);
  const workspaceStage = getWorkspaceStage(campaigns);
  const campaignsWaitingCredits = campaigns.filter((item) => {
    const state = getAdvertiserCampaignState(item);
    return state.actionType === "credits" || state.actionType === "ready";
  });

  function showMessage(text, type = "info") {
    setMessage(text);
    setMessageType(type);
  }

  function showReceipt(title, rows = []) {
    setReceipt({ title, rows, createdAt: new Date().toISOString() });
  }

  async function loadAccounts({ silent = false } = {}) {
    try {
      const [items, pendingItems] = await Promise.all([getMyAdvertiserAccounts(), getMyAdvertiserAccessRequests()]);
      setAccounts(items);
      setRequests(pendingItems);
      if (!accountId && items[0]) setAccountId(items[0].id);
    } catch (error) {
      if (!silent) showMessage(error?.response?.data?.message || "Não foi possível carregar suas contas.", "error");
    }
  }

  async function loadCampaigns(id = accountId) {
    if (!id) return;
    try {
      setData(await getMyAdvertiserCampaigns(id));
    } catch (error) {
      showMessage(error?.response?.data?.message || "Não foi possível carregar campanhas.", "error");
    }
  }

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { loadCampaigns(accountId); }, [accountId]);
  useEffect(() => {
    if (!creative.asset) {
      setCreativePreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(creative.asset);
    setCreativePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [creative.asset]);

  useEffect(() => {
    try {
      if (hasMeaningfulRequestDraft(requestForm)) {
        localStorage.setItem(REQUEST_DRAFT_KEY, JSON.stringify(requestForm));
      } else {
        localStorage.removeItem(REQUEST_DRAFT_KEY);
      }
    } catch (_error) {
      // armazenamento local indisponível
    }
  }, [requestForm]);

  useEffect(() => {
    if (!advertiserIntent) return;
    setRequestForm((current) => ({
      ...current,
      name: current.name || advertiserIntent.accountName,
      type: advertiserIntent.type,
      objective: advertiserIntent.objective,
      message: current.message || advertiserIntent.message,
      contactEmail: current.contactEmail || user?.email || ""
    }));
    setCampaign((current) => ({
      ...current,
      advertiser: current.advertiser || advertiserIntent.accountName,
      name: current.name || (
        advertiserIntent.campaignName
          ? `${getObjectiveLabel(advertiserIntent.objective)} - ${advertiserIntent.campaignName}`
          : ""
      )
    }));
  }, [advertiserIntent, user?.email]);

  function updateRequestForm(event) {
    const { name, value } = event.target;
    setRequestForm((current) => ({ ...current, [name]: value }));
  }

  async function submitAdvertiserRequest(event) {
    event.preventDefault();
    setMessage("");
    setMessageType("info");
    setIsRequesting(true);
    try {
      const item = await requestMyAdvertiserAccess({
        ...requestForm,
        legalName: requestForm.legalName || null,
        contactEmail: requestForm.contactEmail || user?.email || null,
        contactPhone: requestForm.contactPhone || null
      });
      setRequests((current) => [item, ...current.filter((requestItem) => requestItem.id !== item.id)]);
      setRequestForm({ ...INITIAL_REQUEST, contactEmail: user?.email || "" });
      try { localStorage.removeItem(REQUEST_DRAFT_KEY); } catch (_error) { /* armazenamento local indisponível */ }
      showMessage("Solicitação recebida. A equipe 77Gira vai analisar e liberar a Central do Anunciante quando estiver tudo certo.", "success");
      showReceipt("Solicitação registrada", [
        ["Status", "Aguardando análise comercial"],
        ["Próximo passo", "A equipe 77Gira aprova ou recusa o acesso anunciante."],
        ["Login", "Você continuará usando este mesmo usuário do 77Gira."]
      ]);
      await loadAccounts({ silent: true });
    } catch (error) {
      if (error?.response?.status === 401) {
        showMessage("Sua sessão expirou antes do envio. Entre novamente e reenvie a solicitação; os dados digitados foram preservados neste dispositivo.", "warning");
      } else if (error?.response?.status === 404) {
        showMessage("O backend ainda não reconhece o endpoint de solicitação de anunciante. Aguarde o deploy da API e tente novamente.", "warning");
      } else if (error?.response?.status === 409) {
        showMessage(error?.response?.data?.message || "Já existe uma solicitação para este anunciante.", "warning");
        await loadAccounts({ silent: true });
      } else {
        showMessage(error?.response?.data?.message || "Não foi possível enviar a solicitação.", "error");
      }
    } finally {
      setIsRequesting(false);
    }
  }

  async function saveCampaign(event) {
    event.preventDefault();
    try {
      await createMyAdvertiserCampaign(accountId, {
        ...campaign,
        startsAt: campaign.startsAt ? new Date(campaign.startsAt).toISOString() : null,
        endsAt: campaign.endsAt ? new Date(campaign.endsAt).toISOString() : null
      });
      setCampaign({ advertiser: "", name: "", startsAt: "", endsAt: "", runInAllSlots: false });
      showMessage("Rascunho criado. Próximo passo: envie um criativo e depois mande campanha e criativo para revisão 77Gira.", "success");
      showReceipt("Rascunho de campanha criado", [
        ["Status", "Ainda não enviado para revisão"],
        ["Próximo passo", "Enviar criativo e submeter campanha/criativo para análise."],
        ["Publicação", "Nada foi publicado automaticamente."]
      ]);
      await loadCampaigns();
    } catch (error) {
      showMessage(error?.response?.data?.message || "Não foi possível criar a campanha.", "error");
    }
  }

  async function saveCreative(event) {
    event.preventDefault();
    try {
      const asset = await uploadMyAdvertiserCreative({ file: creative.asset, campaignId: creative.campaignId, slot: creative.slot });
      await createMyAdvertiserCreative(creative.campaignId, {
        slot: creative.slot,
        title: creative.title || null,
        destinationUrl: creative.destinationUrl || null,
        altText: creative.altText || null,
        imageUrl: asset.publicUrl,
        width: asset.width,
        height: asset.height,
        storageProvider: asset.storageProvider,
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
        fileSizeBytes: asset.fileSizeBytes,
        checksum: asset.checksum,
        assetVersion: asset.assetVersion
      });
      setCreative({ campaignId: "", slot: SLOTS[0], title: "", destinationUrl: "", altText: "", asset: null });
      showMessage("Criativo enviado com sucesso. Ele foi salvo como rascunho; envie o criativo para revisão para avançar.", "success");
      showReceipt("Criativo salvo", [
        ["Status", "Rascunho de criativo"],
        ["Próximo passo", "Enviar o criativo para revisão 77Gira."],
        ["Prévia", "A campanha exibirá mockups quando houver criativo vinculado."]
      ]);
      await loadCampaigns();
    } catch (error) {
      showMessage(error?.response?.data?.message || "Não foi possível criar o criativo.", "error");
    }
  }

  async function submit(entityType, id) {
    try {
      await submitMyAdvertiserReview(entityType, id);
      showMessage("Enviado para revisão.", "success");
      showReceipt("Item enviado para revisão", [
        ["Status", "Aguardando equipe 77Gira"],
        ["Tipo", entityType === "creative" ? "Criativo" : "Campanha"],
        ["Publicação", "A aprovação não compra créditos nem publica automaticamente."]
      ]);
      await loadCampaigns();
    } catch (error) {
      showMessage(error?.response?.data?.message || "Não foi possível enviar para revisão.", "error");
    }
  }

  return (
    <section className="screen advertiser-console">
      <header className="advertiser-console-topbar">
        <div>
          <div className="ads-brand-lockup" aria-label="77Gira Ads">
            <img src="/logoads77gira.svg" alt="77Gira Ads" className="ads-brand-logo" />
          </div>
          <h2>Workspace do Anunciante</h2>
          <p>Campanhas, criativos e revisão comercial em um ambiente controlado.</p>
        </div>
        <Link to="/anunciar" className="advertiser-console-help">Como funciona</Link>
      </header>

      {message ? <p className={`clean-card advertiser-portal-message advertiser-portal-message-${messageType}`}>{message}</p> : null}
      {receipt ? (
        <aside className="clean-card advertiser-action-receipt">
          <div>
            <span className="eyebrow">Recibo operacional</span>
            <strong>{receipt.title}</strong>
            <small>{new Date(receipt.createdAt).toLocaleString("pt-BR")}</small>
          </div>
          <dl>
            {receipt.rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <button className="chip" type="button" onClick={() => setReceipt(null)}>Ocultar recibo</button>
        </aside>
      ) : null}
      {advertiserIntent ? (
        <aside className="clean-card advertiser-context-card">
          <div>
            <span className="eyebrow">Entrada contextual</span>
            <strong>
              {advertiserIntent.objective === "boost_event"
                ? "Promover evento"
                : advertiserIntent.objective === "boost_venue"
                  ? "Promover casa"
                  : advertiserIntent.type === "artist"
                    ? "Destacar artista ou EPK"
                    : "Criar campanha orientada"}
            </strong>
            <p className="meta-line">
              Você chegou a partir de {advertiserIntent.sourceLabel}. O workspace já trouxe contexto para reduzir
              preenchimento e manter a campanha vinculada ao que será promovido.
            </p>
          </div>
          <div className="advertiser-context-data">
            <span>{getAccountTypeLabel(advertiserIntent.type)}</span>
            <strong>{advertiserIntent.campaignName || advertiserIntent.accountName || "Campanha contextual"}</strong>
            <small>{getObjectiveLabel(advertiserIntent.objective)} · revisão 77Gira obrigatória</small>
          </div>
        </aside>
      ) : null}

      {!accounts.length ? (
        <div className="advertiser-entry-grid advertiser-entry-grid-pro">
          <article className="clean-card advertiser-entry-hero advertiser-entry-hero-pro">
            <span className="eyebrow">Acesso comercial</span>
            <h3>Solicite uma conta anunciante para operar campanhas com revisão 77Gira.</h3>
            <p>
              Este ambiente é destinado a marcas, casas, produtores, artistas e representantes autorizados.
              A criação de campanhas só é liberada após validação comercial e revisão da equipe 77Gira.
            </p>

            <div className="advertiser-benefits advertiser-benefits-pro">
              <span>Campanhas por slot</span>
              <span>Upload controlado</span>
              <span>Revisão antes de publicar</span>
              <span>Métricas de exibição</span>
            </div>

            <div className="advertiser-compliance-note advertiser-compliance-note-pro">
              <strong>Controle e conformidade</strong>
              <p>
                O envio da solicitação não compra mídia, não publica anúncios e não garante aprovação automática.
                Os dados informados podem ser usados para validar legitimidade comercial, titularidade e adequação da campanha.
              </p>
            </div>

            <ol className="advertiser-process-list">
              <li><span>01</span><div><strong>Solicitação</strong><small>Você informa quem anuncia e com qual objetivo.</small></div></li>
              <li><span>02</span><div><strong>Validação</strong><small>A equipe confere legitimidade, contexto e risco.</small></div></li>
              <li><span>03</span><div><strong>Operação</strong><small>Com a conta aprovada, campanhas e criativos entram no fluxo.</small></div></li>
            </ol>

            {hasPendingRequest ? (
              <div className="advertiser-pending-card advertiser-pending-card-pro">
                <strong>Solicitação em análise</strong>
                {requests.map((item) => (
                  <p key={item.id}>{item.name} · {getAccountTypeLabel(item.type)} · {getStatusLabel(item.status)}</p>
                ))}
              </div>
            ) : null}
          </article>

          {hasPendingRequest ? (
          <article className="clean-card advertiser-request-form advertiser-request-form-pro advertiser-request-confirmation">
            <div className="advertiser-form-heading">
              <span className="eyebrow">Solicitação recebida</span>
              <h3>Estamos analisando seu acesso</h3>
              <p>A equipe 77Gira recebeu o pedido e vai liberar o workspace quando a conta anunciante for aprovada.</p>
            </div>
            <div className="advertiser-pending-card advertiser-pending-card-pro">
              <strong>{pendingRequest?.name || "Conta anunciante"}</strong>
              <p>{getAccountTypeLabel(pendingRequest?.type)} · {getStatusLabel(pendingRequest?.status)}</p>
              <small className="meta-line">Você continuará usando este mesmo login do 77Gira. Nenhuma senha separada de ADS será criada.</small>
            </div>
            <button className="btn-primary advertiser-submit-button advertiser-submit-button-success" type="button" disabled>
              Solicitação enviada
            </button>
            <small className="meta-line">Se a aprovação for concluída, a Central do Anunciante será aberta automaticamente nesta área.</small>
          </article>
          ) : (
          <form className="venue-form clean-card advertiser-request-form advertiser-request-form-pro" onSubmit={submitAdvertiserRequest}>
            <div className="advertiser-form-heading">
              <span className="eyebrow">Nova solicitação</span>
              <h3>Acesso de anunciante</h3>
              <p>Preencha com dados comerciais reais. A aprovação não é automática.</p>
            </div>
            <label>Nome público da marca, casa ou projeto<input required minLength={2} maxLength={160} name="name" placeholder="Ex.: Olven Wear" value={requestForm.name} onChange={updateRequestForm}/></label>
            <label>Tipo de anunciante<select name="type" value={requestForm.type} onChange={updateRequestForm}>
              {ACCOUNT_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select></label>
            <label>Razão social ou nome legal<input maxLength={200} name="legalName" placeholder="Opcional, mas recomendado para marcas" value={requestForm.legalName} onChange={updateRequestForm}/></label>
            <div className="advertiser-form-row">
              <label>E-mail de contato<input type="email" name="contactEmail" placeholder="contato@marca.com.br" value={requestForm.contactEmail} onChange={updateRequestForm}/></label>
              <label>Telefone ou WhatsApp<input maxLength={40} name="contactPhone" placeholder="(11) 99999-9999" value={requestForm.contactPhone} onChange={updateRequestForm}/></label>
            </div>
            <label>Objetivo<select name="objective" value={requestForm.objective} onChange={updateRequestForm}>
              {OBJECTIVES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select></label>
            <label>Resumo da intenção<textarea required minLength={10} maxLength={1200} rows={5} name="message" placeholder="Conte o que você pretende anunciar, para quem e qual resultado espera." value={requestForm.message} onChange={updateRequestForm}/></label>
            <button className="btn-primary advertiser-submit-button" type="submit" disabled={isRequesting || hasPendingRequest}>
              {hasPendingRequest ? "Solicitação já enviada" : isRequesting ? "Enviando..." : "Enviar solicitação"}
            </button>
            <small className="meta-line">A revisão continua com a equipe 77Gira. Nenhum anúncio entra no ar automaticamente.</small>
            {hasMeaningfulRequestDraft(requestForm) && !hasPendingRequest ? (
              <small className="meta-line">Rascunho salvo neste dispositivo. Se a sessão expirar, você poderá voltar e continuar.</small>
            ) : null}
          </form>
          )}
        </div>
      ) : (
        <>
          <section className="advertiser-console-panel">
            <div className="advertiser-account-bar clean-card">
              <div>
                <span className="eyebrow">Conta ativa</span>
                <strong>{selectedAccount?.name || "Conta anunciante"}</strong>
                <small>{getAccountTypeLabel(selectedAccount?.type)} · {data.membership?.role || selectedAccount?.membership?.role || "membro"}</small>
              </div>
              <label>Alternar conta<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                {accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.membership.role}</option>)}
              </select></label>
            </div>

            <div className="advertiser-console-metrics">
              <article className="clean-card"><span>Campanhas</span><strong>{campaigns.length}</strong><small>Rascunhos e itens em revisão</small></article>
              <article className="clean-card"><span>Criativos</span><strong>{creativeCount}</strong><small>Arquivos vinculados às campanhas</small></article>
              <article className="clean-card"><span>Em revisão</span><strong>{pendingReviewCount}</strong><small>Aguardando análise 77Gira</small></article>
            </div>

            <section className="clean-card advertiser-guidance-board">
              <div className="advertiser-guidance-head">
                <div>
                  <span className="eyebrow">Guia de publicação</span>
                  <h3>{workspaceStage.title}</h3>
                  <p>{workspaceStage.description}</p>
                </div>
                <small>Nenhuma etapa publica anúncios automaticamente.</small>
              </div>
              <ol className="advertiser-guidance-steps">
                {[
                  ["draft", "Rascunho", "Defina campanha, objetivo e período."],
                  ["creative", "Criativo", "Envie imagem, texto alternativo e destino."],
                  ["review", "Revisão 77Gira", "A equipe valida contexto, qualidade e risco."],
                  ["credits", "Patacos", "Créditos liberam a veiculação quando a compra estiver ativa."]
                ].map(([key, title, description], index) => (
                  <li key={key} className={workspaceStage.activeStep === key ? "active" : ""}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </section>

          {canWrite ? (
            <div className="advertiser-console-workgrid">
              <form className="venue-form clean-card advertiser-console-form" onSubmit={saveCampaign}>
                <div className="advertiser-form-heading">
                  <span className="eyebrow">Campanha</span>
                  <h3>{advertiserIntent ? "Campanha contextual" : "Nova campanha"}</h3>
                  <p>
                    {advertiserIntent
                      ? "Revise os dados sugeridos pelo 77Gira e crie um rascunho antes de enviar para revisão."
                      : "Crie um rascunho antes de enviar para revisão."}
                  </p>
                </div>
                <label>Anunciante<input required placeholder="Nome exibido na campanha" value={campaign.advertiser} onChange={(event) => setCampaign({ ...campaign, advertiser: event.target.value })}/></label>
                <label>Nome da campanha<input required placeholder="Ex.: Lançamento de coleção" value={campaign.name} onChange={(event) => setCampaign({ ...campaign, name: event.target.value })}/></label>
                <div className="advertiser-form-row">
                  <label>Início<input type="datetime-local" value={campaign.startsAt} onChange={(event) => setCampaign({ ...campaign, startsAt: event.target.value })}/></label>
                  <label>Fim<input type="datetime-local" value={campaign.endsAt} onChange={(event) => setCampaign({ ...campaign, endsAt: event.target.value })}/></label>
                </div>
                <label className="advertiser-checkbox"><input type="checkbox" checked={campaign.runInAllSlots} onChange={(event) => setCampaign({ ...campaign, runInAllSlots: event.target.checked })}/> Rodar em todos os slots compatíveis</label>
                <button className="btn-primary" type="submit">Criar rascunho</button>
              </form>

              <form className="venue-form clean-card advertiser-console-form" onSubmit={saveCreative}>
                <div className="advertiser-form-heading">
                  <span className="eyebrow">Criativo</span>
                  <h3>Novo arquivo</h3>
                  <p>Envie a peça e vincule ao slot correto.</p>
                </div>
                <label>Campanha<select required value={creative.campaignId} onChange={(event) => setCreative({ ...creative, campaignId: event.target.value })}>
                  <option value="">Selecione a campanha</option>
                  {campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select></label>
                <label>Slot<select value={creative.slot} onChange={(event) => setCreative({ ...creative, slot: event.target.value })}>
                  {SLOTS.map((slot) => <option value={slot} key={slot}>{SLOT_LABELS[slot] || slot}</option>)}
                </select></label>
                <label>Título<input placeholder="Título interno ou público" value={creative.title} onChange={(event) => setCreative({ ...creative, title: event.target.value })}/></label>
                <label>Link de destino<input type="url" placeholder="https://..." value={creative.destinationUrl} onChange={(event) => setCreative({ ...creative, destinationUrl: event.target.value })}/></label>
                <label>Texto alternativo<input placeholder="Descrição objetiva da imagem" value={creative.altText} onChange={(event) => setCreative({ ...creative, altText: event.target.value })}/></label>
                <label>Arquivo<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCreative({ ...creative, asset: event.target.files?.[0] || null })}/></label>
                {creative.asset ? (
                  <div className="advertiser-selected-file">
                    <div>
                      <span>Arquivo selecionado</span>
                      <strong>{creative.asset.name}</strong>
                      <small>Ao enviar, ele ficará salvo como rascunho e precisará de revisão.</small>
                    </div>
                    {creativePreviewUrl ? (
                      <div className="ads-mobile-frame advertiser-preupload-preview">
                        <div className="ads-mobile-topbar" />
                        <div className="ads-mobile-content">
                          <span>{SLOT_PREVIEW_COPY[creative.slot]?.title || SLOT_LABELS[creative.slot] || creative.slot}</span>
                          <div className="ads-mobile-ad-card">
                            <img src={creativePreviewUrl} alt={creative.altText || creative.title || "Prévia do criativo"} />
                            <div>
                              <strong>{creative.title || "Título do anúncio"}</strong>
                              <small>{SLOT_PREVIEW_COPY[creative.slot]?.description || "Prévia aproximada do slot selecionado."}</small>
                              <em>{SLOT_PREVIEW_COPY[creative.slot]?.cta || "Abrir"}</em>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <button className="btn-primary" type="submit" disabled={!creative.asset}>Enviar criativo</button>
              </form>
            </div>
          ) : (
            <p className="clean-card advertiser-readonly-notice">Seu acesso atual é somente para consulta.</p>
          )}

          <section className="advertiser-campaign-section">
            <div className="advertiser-section-title">
              <span className="eyebrow">Operação</span>
              <h3>Campanhas e status</h3>
              <p className="meta-line">Acompanhe o que foi criado, o que está em revisão e o que ainda falta para veicular.</p>
            </div>
            {!campaigns.length ? (
              <article className="clean-card advertiser-empty-state">
                <strong>Nenhuma campanha criada.</strong>
                <p>Comece criando um rascunho. Depois envie a campanha e os criativos para revisão.</p>
              </article>
            ) : (
              <div className="advertiser-campaign-list">
                {campaigns.map((item) => (
                  <article className="clean-card advertiser-campaign-card" key={item.id}>
                    <div className="advertiser-campaign-card-header">
                      <div>
                        <span className="eyebrow">{item.advertiser}</span>
                        <h3>{item.name}</h3>
                        <p>{formatDate(item.startsAt)} → {formatDate(item.endsAt)}</p>
                      </div>
                      <span className={`status-badge status-${item.reviewStatus || item.status}`}>{getStatusLabel(item.reviewStatus || item.status)}</span>
                    </div>
                    {(() => {
                      const readiness = getAdvertiserCampaignState(item);
                      const primaryCreative = getPrimaryCreative(item);
                      const previewSlots = item.runInAllSlots ? SLOTS : [...new Set((item.creatives || []).map((creativeItem) => creativeItem.slot))];
                      const liveCreative = creative.campaignId === item.id
                        ? {
                            slot: creative.slot,
                            title: creative.title,
                            altText: creative.altText,
                            imageUrl: creativePreviewUrl
                          }
                        : {};
                      const livePreviewSlots = getCampaignPreviewSlots(item, liveCreative);
                      const previewSlot = liveCreative.slot || primaryCreative?.slot || livePreviewSlots[0];
                      const blockers = getCampaignBlockers(item);
                      const previewCopy = SLOT_PREVIEW_COPY[previewSlot] || { description: "Prévia aproximada do slot selecionado.", cta: "Abrir" };
                      return (
                        <>
                          <div className="advertiser-campaign-delivery">
                            <span className={`status-badge status-${readiness.tone}`}>{readiness.deliveryLabel}</span>
                            <div className="advertiser-campaign-progress">
                              <div className="advertiser-campaign-progress-bar"><span style={{ width: `${readiness.progress}%` }} /></div>
                              <small>{readiness.nextAction}</small>
                            </div>
                            <div className="advertiser-campaign-steps">
                              {readiness.steps.map((step) => (
                                <span key={step.label} className={`${step.complete ? "complete" : ""} ${step.current ? "current" : ""}`}>
                                  {step.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="advertiser-campaign-blockers" aria-label="Checklist de liberação da campanha">
                            <strong>Checklist para entrar no ar</strong>
                            {blockers.map((blocker) => (
                              <div key={blocker.label} className={blocker.complete ? "complete" : ""}>
                                <span>{blocker.complete ? "OK" : "Pendente"}</span>
                                <p><b>{blocker.label}</b><small>{blocker.help}</small></p>
                              </div>
                            ))}
                          </div>
                          <div className="advertiser-campaign-readiness">
                            <article>
                              <span>Créditos</span>
                              <strong>{Number(item.creditBalance || item.budgetCredits || 0)}</strong>
                              <small>Compra de impulsionamento ainda não liberada nesta etapa.</small>
                            </article>
                            <article>
                              <span>Criativos</span>
                              <strong>{item.creatives?.length || 0}</strong>
                              <small>{primaryCreative ? "Há material para prévia visual." : "Envie uma imagem para visualizar."}</small>
                            </article>
                            <article>
                              <span>Slots</span>
                              <strong>{livePreviewSlots.length || previewSlots.length || 0}</strong>
                              <small>{item.runInAllSlots ? "Todos os compatíveis" : "Conforme criativos enviados"}</small>
                            </article>
                          </div>
                          <section className="advertiser-campaign-live-preview">
                            <div className="advertiser-live-preview-heading">
                              <span className="eyebrow">Prévia mobile</span>
                              <strong>Como o anúncio começa a tomar forma</strong>
                              <small>Atualiza conforme campanha, slot, título e criativo.</small>
                            </div>
                            <AdsMobilePreview
                              slot={previewSlot}
                              imageUrl={liveCreative.imageUrl || primaryCreative?.imageUrl || ""}
                              title={liveCreative.title || primaryCreative?.title || item.name}
                              altText={liveCreative.altText || primaryCreative?.altText || item.name}
                              description={previewCopy.description}
                              cta={previewCopy.cta}
                              campaignName={item.name}
                              compact
                            />
                          </section>
                          {primaryCreative ? (
                            <section className="advertiser-slot-preview-section">
                              <div className="advertiser-form-heading">
                                <span className="eyebrow">Prévia de veiculação</span>
                                <h3>Como o anúncio pode aparecer no app</h3>
                                <p>Mockups aproximados para reduzir dúvida antes da revisão e da compra de créditos.</p>
                              </div>
                              <div className="advertiser-slot-preview-grid">
                                {(previewSlots.length ? previewSlots : [primaryCreative.slot]).map((slot) => {
                                  const slotCopy = SLOT_PREVIEW_COPY[slot] || { title: SLOT_LABELS[slot] || slot, description: "Slot publicitário 77Gira.", cta: "Abrir" };
                                  return (
                                    <article className={`ads-mobile-slot-preview ads-mobile-slot-preview-${slot}`} key={`${item.id}-${slot}`}>
                                      <div className="ads-mobile-frame">
                                        <div className="ads-mobile-topbar" />
                                        <div className="ads-mobile-content">
                                          <span>{slotCopy.title}</span>
                                          <div className="ads-mobile-ad-card">
                                            <img src={primaryCreative.imageUrl} alt={primaryCreative.altText || primaryCreative.title || item.name} />
                                            <div>
                                              <strong>{primaryCreative.title || item.name}</strong>
                                              <small>{slotCopy.description}</small>
                                              <em>{slotCopy.cta}</em>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <p>{SLOT_LABELS[slot] || slot}</p>
                                    </article>
                                  );
                                })}
                              </div>
                            </section>
                          ) : null}
                        </>
                      );
                    })()}
                    {canWrite ? (() => {
                      const state = getAdvertiserCampaignState(item);
                      if (state.actionType === "prepare_creative") {
                        return (
                          <button
                            className="chip active"
                            type="button"
                            onClick={() => {
                              setCreative((current) => ({ ...current, campaignId: item.id }));
                              showMessage("Campanha selecionada. Agora envie uma imagem no formulário de criativo.", "info");
                            }}
                          >
                            Preparar criativo
                          </button>
                        );
                      }
                      if (state.actionType === "submit_creative" && state.draftCreativeId) {
                        return <button className="chip active" type="button" onClick={() => submit("creative", state.draftCreativeId)}>Enviar criativo para revisão</button>;
                      }
                      if (state.actionType === "submit_campaign") {
                        return <button className="chip active" type="button" onClick={() => submit("campaign", item.id)}>Enviar campanha para revisão</button>;
                      }
                      if (state.actionType === "credits") {
                        return <button className="chip" type="button" disabled>Créditos em breve</button>;
                      }
                      return <p className="meta-line advertiser-action-help">{state.actionHelp}</p>;
                    })() : null}
                    <div className="advertiser-creative-grid">
                      {(item.creatives || []).map((creativeItem) => (
                        <div className="advertiser-creative-card" key={creativeItem.id}>
                          <img className="ads-review-image" src={creativeItem.imageUrl} alt={creativeItem.altText || creativeItem.title || "Criativo"}/>
                          <div>
                            <strong>{creativeItem.title || SLOT_LABELS[creativeItem.slot] || creativeItem.slot}</strong>
                            <small>{SLOT_LABELS[creativeItem.slot] || creativeItem.slot} · {getStatusLabel(creativeItem.reviewStatus)}</small>
                          </div>
                          {canWrite && ["draft", "rejected", "changes_requested"].includes(creativeItem.reviewStatus) ? (
                            <button className="chip" onClick={() => submit("creative", creativeItem.id)}>Enviar criativo</button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="clean-card advertiser-credit-panel">
            <div className="advertiser-credit-heading">
              <div>
                <span className="eyebrow">Créditos de mídia</span>
                <h3>Patacos para impulsionamento</h3>
                <p>
                  Esta camada prepara a compra de créditos sem liberar cobrança automática ainda. Quando o meio de pagamento
                  for conectado, campanhas aprovadas poderão converter patacos em veiculação.
                </p>
              </div>
              <span className="status-badge status-draft">Em preparação</span>
            </div>
            <div className="advertiser-credit-summary">
              <article>
                <span>Saldo disponível</span>
                <strong>0</strong>
                <small>Patacos ativos nesta conta.</small>
              </article>
              <article>
                <span>Aguardando créditos</span>
                <strong>{campaignsWaitingCredits.length}</strong>
                <small>Campanhas aprovadas ou maduras que ainda dependem da etapa financeira.</small>
              </article>
            </div>
            <div className="advertiser-credit-packages">
              {CREDIT_PACKAGES.map((item) => (
                <article key={item.name}>
                  <span>{item.name}</span>
                  <strong>{item.credits}</strong>
                  <p>{item.description}</p>
                  <button
                    className="chip"
                    type="button"
                    onClick={() => showMessage("Compra de patacos ainda não está ativa. A equipe 77Gira pode liberar este pacote quando o financeiro for conectado.", "warning")}
                  >
                    Reservar interesse
                  </button>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
