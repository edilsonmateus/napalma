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
const VALID_TYPES = new Set(ACCOUNT_TYPES.map(([value]) => value));
const VALID_OBJECTIVES = new Set(OBJECTIVES.map(([value]) => value));
const REQUEST_DRAFT_KEY = "77gira.ads.advertiserRequestDraft";

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

export default function AdvertiserPortalPage() {
  const user = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [data, setData] = useState({ items: [], membership: null });
  const [campaign, setCampaign] = useState({ advertiser: "", name: "", startsAt: "", endsAt: "", runInAllSlots: false });
  const [creative, setCreative] = useState({ campaignId: "", slot: SLOTS[0], title: "", destinationUrl: "", altText: "", asset: null });
  const [requestForm, setRequestForm] = useState(() => readRequestDraft(user?.email));
  const [message, setMessage] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  const selectedAccount = useMemo(() => accounts.find((item) => item.id === accountId), [accountId, accounts]);
  const canWrite = WRITERS.includes(data.membership?.role);
  const hasPendingRequest = requests.length > 0;
  const pendingRequest = requests[0];
  const campaigns = data.items || [];
  const creativeCount = campaigns.reduce((total, item) => total + (item.creatives?.length || 0), 0);
  const pendingReviewCount = campaigns.filter((item) => item.reviewStatus === "pending_review").length
    + campaigns.reduce((total, item) => total + (item.creatives || []).filter((creativeItem) => creativeItem.reviewStatus === "pending_review").length, 0);

  async function loadAccounts({ silent = false } = {}) {
    try {
      const [items, pendingItems] = await Promise.all([getMyAdvertiserAccounts(), getMyAdvertiserAccessRequests()]);
      setAccounts(items);
      setRequests(pendingItems);
      if (!accountId && items[0]) setAccountId(items[0].id);
    } catch (error) {
      if (!silent) setMessage(error?.response?.data?.message || "Não foi possível carregar suas contas.");
    }
  }

  async function loadCampaigns(id = accountId) {
    if (!id) return;
    try {
      setData(await getMyAdvertiserCampaigns(id));
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível carregar campanhas.");
    }
  }

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { loadCampaigns(accountId); }, [accountId]);

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
    const source = searchParams.get("source") || "";
    if (!source) return;
    const name = searchParams.get("name") || "";
    const accountName = searchParams.get("accountName") || name;
    const campaignName = searchParams.get("campaignName") || name;
    const type = searchParams.get("type") || "";
    const objective = searchParams.get("objective") || "";
    const messageParam = searchParams.get("message") || "";
    setRequestForm((current) => ({
      ...current,
      name: current.name || accountName,
      type: VALID_TYPES.has(type) ? type : current.type,
      objective: VALID_OBJECTIVES.has(objective) ? objective : current.objective,
      message: current.message || messageParam,
      contactEmail: current.contactEmail || user?.email || ""
    }));
    setCampaign((current) => ({
      ...current,
      advertiser: current.advertiser || accountName,
      name: current.name || (objective === "boost_event" && campaignName ? `Impulsionamento - ${campaignName}` : "")
    }));
  }, [searchParams, user?.email]);

  function updateRequestForm(event) {
    const { name, value } = event.target;
    setRequestForm((current) => ({ ...current, [name]: value }));
  }

  async function submitAdvertiserRequest(event) {
    event.preventDefault();
    setMessage("");
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
      setMessage("Solicitação recebida. A equipe 77Gira vai analisar e liberar a Central do Anunciante quando estiver tudo certo.");
      await loadAccounts({ silent: true });
    } catch (error) {
      if (error?.response?.status === 401) {
        setMessage("Sua sessão expirou antes do envio. Entre novamente e reenvie a solicitação; os dados digitados foram preservados neste dispositivo.");
      } else if (error?.response?.status === 404) {
        setMessage("O backend ainda não reconhece o endpoint de solicitação de anunciante. Aguarde o deploy da API e tente novamente.");
      } else if (error?.response?.status === 409) {
        setMessage(error?.response?.data?.message || "Já existe uma solicitação para este anunciante.");
        await loadAccounts({ silent: true });
      } else {
        setMessage(error?.response?.data?.message || "Não foi possível enviar a solicitação.");
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
      setMessage("Campanha criada como rascunho.");
      await loadCampaigns();
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível criar a campanha.");
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
      setMessage("Criativo enviado e salvo como rascunho.");
      await loadCampaigns();
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível criar o criativo.");
    }
  }

  async function submit(entityType, id) {
    try {
      await submitMyAdvertiserReview(entityType, id);
      setMessage("Enviado para revisão.");
      await loadCampaigns();
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível enviar para revisão.");
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

      {message ? <p className="clean-card advertiser-portal-message">{message}</p> : null}

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
          </section>

          {canWrite ? (
            <div className="advertiser-console-workgrid">
              <form className="venue-form clean-card advertiser-console-form" onSubmit={saveCampaign}>
                <div className="advertiser-form-heading">
                  <span className="eyebrow">Campanha</span>
                  <h3>Nova campanha</h3>
                  <p>Crie um rascunho antes de enviar para revisão.</p>
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
                <button className="btn-primary" type="submit" disabled={!creative.asset}>Enviar criativo</button>
              </form>
            </div>
          ) : (
            <p className="clean-card advertiser-readonly-notice">Seu acesso atual é somente para consulta.</p>
          )}

          <section className="advertiser-campaign-section">
            <div className="advertiser-section-title">
              <span className="eyebrow">Operação</span>
              <h3>Campanhas</h3>
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
                    {canWrite && ["draft", "rejected", "changes_requested"].includes(item.reviewStatus) ? (
                      <button className="chip" onClick={() => submit("campaign", item.id)}>Enviar campanha para revisão</button>
                    ) : null}
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
        </>
      )}
    </section>
  );
}
