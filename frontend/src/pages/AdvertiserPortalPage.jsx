import { useEffect, useState } from "react";
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
  ["agency", "Agencia"],
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
const INITIAL_REQUEST = { name: "", type: "brand", legalName: "", contactEmail: "", contactPhone: "", objective: "brand_campaign", message: "" };

export default function AdvertiserPortalPage() {
  const user = useAuthStore((state) => state.user);
  const [accounts, setAccounts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [data, setData] = useState({ items: [], membership: null });
  const [campaign, setCampaign] = useState({ advertiser: "", name: "", startsAt: "", endsAt: "", runInAllSlots: false });
  const [creative, setCreative] = useState({ campaignId: "", slot: SLOTS[0], title: "", destinationUrl: "", altText: "", asset: null });
  const [requestForm, setRequestForm] = useState(() => ({ ...INITIAL_REQUEST, contactEmail: user?.email || "" }));
  const [message, setMessage] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  async function loadAccounts() {
    try {
      const [items, pendingItems] = await Promise.all([getMyAdvertiserAccounts(), getMyAdvertiserAccessRequests()]);
      setAccounts(items);
      setRequests(pendingItems);
      if (!accountId && items[0]) setAccountId(items[0].id);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Nao foi possivel carregar suas contas.");
    }
  }
  async function loadCampaigns(id = accountId) {
    if (!id) return;
    try { setData(await getMyAdvertiserCampaigns(id)); } catch (error) { setMessage(error?.response?.data?.message || "Nao foi possivel carregar campanhas."); }
  }
  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { loadCampaigns(accountId); }, [accountId]);
  const canWrite = WRITERS.includes(data.membership?.role);
  const hasPendingRequest = requests.length > 0;

  function updateRequestForm(event) {
    const { name, value } = event.target;
    setRequestForm((current) => ({ ...current, [name]: value }));
  }

  async function submitAdvertiserRequest(event) {
    event.preventDefault();
    setMessage("");
    setIsRequesting(true);
    try {
      await requestMyAdvertiserAccess({
        ...requestForm,
        legalName: requestForm.legalName || null,
        contactEmail: requestForm.contactEmail || user?.email || null,
        contactPhone: requestForm.contactPhone || null
      });
      setRequestForm({ ...INITIAL_REQUEST, contactEmail: user?.email || "" });
      setMessage("Solicitacao enviada. A equipe 77Gira vai analisar e liberar a Central do Anunciante quando estiver tudo certo.");
      await loadAccounts();
    } catch (error) {
      setMessage(error?.response?.data?.message || "Nao foi possivel enviar a solicitacao.");
    } finally {
      setIsRequesting(false);
    }
  }

  async function saveCampaign(event) {
    event.preventDefault();
    try {
      await createMyAdvertiserCampaign(accountId, { ...campaign, startsAt: campaign.startsAt ? new Date(campaign.startsAt).toISOString() : null, endsAt: campaign.endsAt ? new Date(campaign.endsAt).toISOString() : null });
      setCampaign({ advertiser: "", name: "", startsAt: "", endsAt: "", runInAllSlots: false }); setMessage("Campanha criada como rascunho."); await loadCampaigns();
    } catch (error) { setMessage(error?.response?.data?.message || "Nao foi possivel criar a campanha."); }
  }
  async function saveCreative(event) {
    event.preventDefault();
    try {
      const asset = await uploadMyAdvertiserCreative({ file: creative.asset, campaignId: creative.campaignId, slot: creative.slot });
      await createMyAdvertiserCreative(creative.campaignId, { slot: creative.slot, title: creative.title || null, destinationUrl: creative.destinationUrl || null, altText: creative.altText || null, imageUrl: asset.publicUrl, width: asset.width, height: asset.height, storageProvider: asset.storageProvider, storageKey: asset.storageKey, mimeType: asset.mimeType, fileSizeBytes: asset.fileSizeBytes, checksum: asset.checksum, assetVersion: asset.assetVersion });
      setCreative({ campaignId: "", slot: SLOTS[0], title: "", destinationUrl: "", altText: "", asset: null }); setMessage("Criativo enviado e salvo como rascunho."); await loadCampaigns();
    } catch (error) { setMessage(error?.response?.data?.message || "Nao foi possivel criar o criativo."); }
  }
  async function submit(entityType, id) {
    try { await submitMyAdvertiserReview(entityType, id); setMessage("Enviado para revisao."); await loadCampaigns(); }
    catch (error) { setMessage(error?.response?.data?.message || "Nao foi possivel enviar para revisao."); }
  }

  return <section className="screen screen-history advertiser-portal">
    <header className="page-header advertiser-portal-header">
      <span className="eyebrow">77Gira Ads</span>
      <h2>Central do Anunciante</h2>
      <p>Crie campanhas para marcas, casas, eventos e artistas com revisao antes da exibicao publica.</p>
    </header>
    {message ? <p className="clean-card advertiser-portal-message">{message}</p> : null}
    {!accounts.length ? (
      <div className="advertiser-entry-grid">
        <article className="clean-card advertiser-entry-hero">
          <span className="eyebrow">Acesso comercial</span>
          <h3>Anuncie no 77Gira sem perder o controle da marca.</h3>
          <p>Solicite sua conta anunciante para impulsionar eventos, casas, artistas ou campanhas institucionais. A equipe 77Gira revisa o pedido antes de liberar a criacao de campanhas.</p>
          <div className="advertiser-benefits">
            <span>Campanhas por slot</span>
            <span>Upload de criativos</span>
            <span>Revisao antes de publicar</span>
            <span>Metricas de exibicao</span>
          </div>
          {hasPendingRequest ? (
            <div className="advertiser-pending-card">
              <strong>Solicitacao em analise</strong>
              {requests.map((item) => <p key={item.id}>{item.name} · {item.type} · {item.status}</p>)}
            </div>
          ) : null}
        </article>
        <form className="venue-form clean-card advertiser-request-form" onSubmit={submitAdvertiserRequest}>
          <h3>Solicitar acesso de anunciante</h3>
          <input required minLength={2} maxLength={160} name="name" placeholder="Nome da marca, casa ou projeto" value={requestForm.name} onChange={updateRequestForm}/>
          <select name="type" value={requestForm.type} onChange={updateRequestForm} aria-label="Tipo de anunciante">
            {ACCOUNT_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
          <input maxLength={200} name="legalName" placeholder="Razao social (opcional)" value={requestForm.legalName} onChange={updateRequestForm}/>
          <input type="email" name="contactEmail" placeholder="E-mail de contato" value={requestForm.contactEmail} onChange={updateRequestForm}/>
          <input maxLength={40} name="contactPhone" placeholder="Telefone ou WhatsApp" value={requestForm.contactPhone} onChange={updateRequestForm}/>
          <select name="objective" value={requestForm.objective} onChange={updateRequestForm} aria-label="Objetivo da campanha">
            {OBJECTIVES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
          <textarea required minLength={10} maxLength={1200} rows={5} name="message" placeholder="Conte o que voce pretende anunciar e qual resultado espera" value={requestForm.message} onChange={updateRequestForm}/>
          <button className="btn-primary" type="submit" disabled={isRequesting || hasPendingRequest}>
            {hasPendingRequest ? "Solicitacao ja enviada" : isRequesting ? "Enviando..." : "Enviar solicitacao"}
          </button>
          <small className="meta-line">O envio nao libera anuncios automaticamente. A aprovacao continua com a equipe 77Gira.</small>
        </form>
      </div>
    ) : <>
      <div className="clean-card"><label>Conta anunciante<select value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.membership.role}</option>)}</select></label></div>
      {canWrite ? <div className="ads-hard-grid ads-hard-forms">
        <form className="venue-form clean-card" onSubmit={saveCampaign}><h3>Nova campanha</h3><input required placeholder="Anunciante" value={campaign.advertiser} onChange={(e) => setCampaign({ ...campaign, advertiser: e.target.value })}/><input required placeholder="Nome da campanha" value={campaign.name} onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}/><label>Inicio<input type="datetime-local" value={campaign.startsAt} onChange={(e) => setCampaign({ ...campaign, startsAt: e.target.value })}/></label><label>Fim<input type="datetime-local" value={campaign.endsAt} onChange={(e) => setCampaign({ ...campaign, endsAt: e.target.value })}/></label><button className="chip active" type="submit">Criar rascunho</button></form>
        <form className="venue-form clean-card" onSubmit={saveCreative}><h3>Novo criativo</h3><select required value={creative.campaignId} onChange={(e) => setCreative({ ...creative, campaignId: e.target.value })}><option value="">Selecione a campanha</option>{data.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={creative.slot} onChange={(e) => setCreative({ ...creative, slot: e.target.value })}>{SLOTS.map((slot) => <option key={slot}>{slot}</option>)}</select><input placeholder="Titulo" value={creative.title} onChange={(e) => setCreative({ ...creative, title: e.target.value })}/><input type="url" placeholder="Link de destino" value={creative.destinationUrl} onChange={(e) => setCreative({ ...creative, destinationUrl: e.target.value })}/><input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCreative({ ...creative, asset: e.target.files?.[0] || null })}/><button className="chip active" type="submit" disabled={!creative.asset}>Enviar criativo</button></form>
      </div> : <p className="clean-card">Seu acesso e somente para consulta.</p>}
      <div className="admin-list"><h3>Campanhas</h3>{data.items.map((item) => <article className="clean-card" key={item.id}><div className="advertiser-readonly-title"><div><h3>{item.name}</h3><p>{item.advertiser}</p></div><span className={`status-badge status-${item.reviewStatus || item.status}`}>{item.reviewStatus || "legado"}</span></div>{canWrite && ["draft", "rejected", "changes_requested"].includes(item.reviewStatus) ? <button className="chip" onClick={() => submit("campaign", item.id)}>Enviar campanha para revisao</button> : null}<div className="ads-review-grid">{item.creatives.map((creativeItem) => <div key={creativeItem.id}><img className="ads-review-image" src={creativeItem.imageUrl} alt={creativeItem.altText || creativeItem.title || "Criativo"}/><p>{creativeItem.title || creativeItem.slot} · {creativeItem.reviewStatus || "legado"}</p>{canWrite && ["draft", "rejected", "changes_requested"].includes(creativeItem.reviewStatus) ? <button className="chip" onClick={() => submit("creative", creativeItem.id)}>Enviar criativo</button> : null}</div>)}</div></article>)}</div>
    </>}
  </section>;
}
