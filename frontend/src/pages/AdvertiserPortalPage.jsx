import { useEffect, useState } from "react";
import { createMyAdvertiserCampaign, createMyAdvertiserCreative, getMyAdvertiserAccounts, getMyAdvertiserCampaigns, submitMyAdvertiserReview, uploadMyAdvertiserCreative } from "../services/advertiserPortal.service";

const WRITERS = ["owner", "admin", "campaign_manager"];
const SLOTS = ["explore_feed_large", "venue_detail_inline", "radar_header"];

export default function AdvertiserPortalPage() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [data, setData] = useState({ items: [], membership: null });
  const [campaign, setCampaign] = useState({ advertiser: "", name: "", startsAt: "", endsAt: "", runInAllSlots: false });
  const [creative, setCreative] = useState({ campaignId: "", slot: SLOTS[0], title: "", destinationUrl: "", altText: "", asset: null });
  const [message, setMessage] = useState("");

  async function loadAccounts() {
    try { const items = await getMyAdvertiserAccounts(); setAccounts(items); if (!accountId && items[0]) setAccountId(items[0].id); }
    catch (error) { setMessage(error?.response?.data?.message || "Nao foi possivel carregar suas contas."); }
  }
  async function loadCampaigns(id = accountId) {
    if (!id) return;
    try { setData(await getMyAdvertiserCampaigns(id)); } catch (error) { setMessage(error?.response?.data?.message || "Nao foi possivel carregar campanhas."); }
  }
  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { loadCampaigns(accountId); }, [accountId]);
  const canWrite = WRITERS.includes(data.membership?.role);

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
    <header className="page-header"><h2>Central do Anunciante</h2><p>Crie campanhas e acompanhe a aprovacao dos seus anuncios.</p></header>
    {message ? <p className="clean-card">{message}</p> : null}
    {!accounts.length ? <div className="clean-card"><h3>Nenhuma conta disponivel</h3><p>Solicite ao administrador um vinculo ativo com uma conta anunciante.</p></div> : <>
      <div className="clean-card"><label>Conta anunciante<select value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.membership.role}</option>)}</select></label></div>
      {canWrite ? <div className="ads-hard-grid ads-hard-forms">
        <form className="venue-form clean-card" onSubmit={saveCampaign}><h3>Nova campanha</h3><input required placeholder="Anunciante" value={campaign.advertiser} onChange={(e) => setCampaign({ ...campaign, advertiser: e.target.value })}/><input required placeholder="Nome da campanha" value={campaign.name} onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}/><label>Inicio<input type="datetime-local" value={campaign.startsAt} onChange={(e) => setCampaign({ ...campaign, startsAt: e.target.value })}/></label><label>Fim<input type="datetime-local" value={campaign.endsAt} onChange={(e) => setCampaign({ ...campaign, endsAt: e.target.value })}/></label><button className="chip active" type="submit">Criar rascunho</button></form>
        <form className="venue-form clean-card" onSubmit={saveCreative}><h3>Novo criativo</h3><select required value={creative.campaignId} onChange={(e) => setCreative({ ...creative, campaignId: e.target.value })}><option value="">Selecione a campanha</option>{data.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={creative.slot} onChange={(e) => setCreative({ ...creative, slot: e.target.value })}>{SLOTS.map((slot) => <option key={slot}>{slot}</option>)}</select><input placeholder="Titulo" value={creative.title} onChange={(e) => setCreative({ ...creative, title: e.target.value })}/><input type="url" placeholder="Link de destino" value={creative.destinationUrl} onChange={(e) => setCreative({ ...creative, destinationUrl: e.target.value })}/><input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCreative({ ...creative, asset: e.target.files?.[0] || null })}/><button className="chip active" type="submit" disabled={!creative.asset}>Enviar criativo</button></form>
      </div> : <p className="clean-card">Seu acesso e somente para consulta.</p>}
      <div className="admin-list"><h3>Campanhas</h3>{data.items.map((item) => <article className="clean-card" key={item.id}><div className="advertiser-readonly-title"><div><h3>{item.name}</h3><p>{item.advertiser}</p></div><span className={`status-badge status-${item.reviewStatus || item.status}`}>{item.reviewStatus || "legado"}</span></div>{canWrite && ["draft", "rejected", "changes_requested"].includes(item.reviewStatus) ? <button className="chip" onClick={() => submit("campaign", item.id)}>Enviar campanha para revisao</button> : null}<div className="ads-review-grid">{item.creatives.map((creativeItem) => <div key={creativeItem.id}><img className="ads-review-image" src={creativeItem.imageUrl} alt={creativeItem.altText || creativeItem.title || "Criativo"}/><p>{creativeItem.title || creativeItem.slot} · {creativeItem.reviewStatus || "legado"}</p>{canWrite && ["draft", "rejected", "changes_requested"].includes(creativeItem.reviewStatus) ? <button className="chip" onClick={() => submit("creative", creativeItem.id)}>Enviar criativo</button> : null}</div>)}</div></article>)}</div>
    </>}
  </section>;
}
