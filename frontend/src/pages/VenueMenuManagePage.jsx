import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ClipboardList, FileSpreadsheet, List, Megaphone, SquarePlus } from "lucide-react";
import BackLink from "../components/common/BackLink";
import {
  useArchiveVenueMenuItemMutation, useCreateVenueMenuItemMutation,
  useImportVenueMenuItemsMutation, useManagedVenueMenuQuery,
  useReorderVenueMenuItemsMutation, useRestoreVenueMenuItemMutation, useUpdateVenueMenuItemMutation, useUpdateVenueMenuMutation
} from "../hooks/useVenueMenu";
import { downloadVenueMenuCsv, parseVenueMenuCsv, VENUE_MENU_TEMPLATE_ITEM } from "../utils/venueMenuCsv";

const EMPTY_ITEM = { category: "petiscos", name: "", description: "", price: "", priceMode: "exact", servingLabel: "", status: "published", tags: [], isHighlight: false };
const LABELS = { petiscos: "Petiscos", porcoes: "Porcoes", pratos: "Pratos", lanches: "Lanches", sobremesas: "Sobremesas", cervejas: "Cervejas", drinks: "Drinks", doses: "Doses", vinhos_espumantes: "Vinhos e espumantes", sem_alcool: "Sem alcool" };
const SERVING_LABELS = { individual: "Individual", serve_2: "Serve duas pessoas", serve_3_ou_mais: "Serve três ou mais", unidade: "Unidade", dose: "Dose", garrafa: "Garrafa", lata: "Lata", porcao: "Porção", jarra: "Jarra", balde: "Balde" };
const TAG_LABELS = { especialidade_da_casa: "Especialidade da casa", destaque_da_casa: "Destaque da casa", bom_para_compartilhar: "Bom para compartilhar", vegetariano: "Vegetariano", vegano: "Vegano", sem_alcool: "Sem álcool", picante: "Picante", edicao_limitada: "Edição limitada" };

export default function VenueMenuManagePage() {
  const { venueId } = useParams();
  const { data, isLoading } = useManagedVenueMenuQuery(venueId);
  const saveMenu = useUpdateVenueMenuMutation();
  const createItem = useCreateVenueMenuItemMutation();
  const updateItem = useUpdateVenueMenuItemMutation();
  const reorderItems = useReorderVenueMenuItemsMutation();
  const archiveItem = useArchiveVenueMenuItemMutation();
  const restoreItem = useRestoreVenueMenuItemMutation();
  const importItems = useImportVenueMenuItemsMutation();
  const [form, setForm] = useState(EMPTY_ITEM);
  const [editingId, setEditingId] = useState(null);
  const [acceptanceChecked, setAcceptanceChecked] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [listView, setListView] = useState("active");
  const [importPreview, setImportPreview] = useState(null);
  const [importFileName, setImportFileName] = useState("");
  const menu = data?.item;
  const options = data?.options || { categories: Object.keys(LABELS), servings: [], tags: [] };
  const activeItems = (menu?.items || []).filter((item) => item.status !== "archived");
  const archivedItems = (menu?.items || []).filter((item) => item.status === "archived");
  const visibleItems = listView === "archived" ? archivedItems : activeItems;
  const adInventoryAccepted = Boolean(menu?.adInventoryAcceptedAt);

  useEffect(() => { if (!editingId) setForm(EMPTY_ITEM); }, [editingId]);
  function payloadFromForm() {
    return { ...form, priceCents: form.price === "" ? null : Math.round(Number(String(form.price).replace(",", ".")) * 100), servingLabel: form.servingLabel || null };
  }
  async function submitItem(event) {
    event.preventDefault(); setFeedback("");
    try {
      const payload = payloadFromForm(); delete payload.price;
      if (editingId) await updateItem.mutateAsync({ venueId, itemId: editingId, payload });
      else await createItem.mutateAsync({ venueId, payload });
      setEditingId(null); setForm(EMPTY_ITEM); setFeedback("Item salvo.");
    } catch (error) { setFeedback(error?.response?.data?.message || error?.response?.data?.issues?.[0]?.message || "Nao foi possivel salvar o item."); }
  }
  function edit(item) {
    setEditingId(item.id);
    setForm({ ...item, price: item.priceCents == null ? "" : (item.priceCents / 100).toFixed(2).replace(".", ","), servingLabel: item.servingLabel || "" });
  }
  function toggleTag(tag) {
    setForm((current) => ({ ...current, tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : current.tags.length < 4 ? [...current.tags, tag] : current.tags }));
  }
  async function moveItem(itemId, direction) {
    const index = activeItems.findIndex((item) => item.id === itemId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= activeItems.length) return;
    const reordered = [...activeItems];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    await reorderItems.mutateAsync({ venueId, items: reordered.map((item, itemIndex) => ({ id: item.id, sortOrder: itemIndex * 10 })) });
    setFeedback("Ordem atualizada.");
  }
  async function handleArchive(itemId) {
    try {
      await archiveItem.mutateAsync({ venueId, itemId });
      setFeedback("Item arquivado. Ele continua disponivel na aba Arquivados.");
    } catch (error) { setFeedback(error?.response?.data?.message || "Nao foi possivel arquivar o item."); }
  }
  async function handleRestore(itemId) {
    try {
      await restoreItem.mutateAsync({ venueId, itemId });
      setFeedback("Item restaurado como rascunho.");
      setListView("active");
    } catch (error) { setFeedback(error?.response?.data?.message || "Nao foi possivel restaurar o item."); }
  }
  async function handleCsvFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 512 * 1024) {
      setImportPreview({ items: [], errors: ["O arquivo excede o limite de 512 KB."] });
      setImportFileName(file.name);
      return;
    }
    const preview = parseVenueMenuCsv(await file.text(), options);
    if (activeItems.length + preview.items.length > 30) preview.errors.push(`A importacao ultrapassaria 30 itens ativos. Hoje o cardapio tem ${activeItems.length}.`);
    setImportFileName(file.name);
    setImportPreview(preview);
    setFeedback("");
  }
  async function confirmCsvImport() {
    if (!importPreview?.items?.length || importPreview.errors.length) return;
    try {
      const result = await importItems.mutateAsync({ venueId, items: importPreview.items });
      setFeedback(`${result.count} item(ns) importado(s) como um unico lote.`);
      setImportPreview(null);
      setImportFileName("");
      setListView("active");
    } catch (error) { setFeedback(error?.response?.data?.message || "Nao foi possivel importar o cardapio."); }
  }
  async function acceptAdInventoryTerms() {
    if (!acceptanceChecked || adInventoryAccepted) return;
    try {
      await saveMenu.mutateAsync({ venueId, payload: { acceptAdInventoryTerms: true } });
      setFeedback("Condições de publicidade do Cardápio Essencial aceitas.");
    } catch (error) { setFeedback(error?.response?.data?.message || "Nao foi possivel registrar a confirmação."); }
  }
  async function publishMenu() {
    try {
      await saveMenu.mutateAsync({ venueId, payload: { status: "published", markReviewed: true } });
      setFeedback("Cardápio publicado e marcado como revisado.");
    } catch (error) { setFeedback(error?.response?.data?.message || "Nao foi possivel publicar o cardapio."); }
  }
  if (isLoading) return <p className="empty">Carregando gestao do cardapio...</p>;
  return (
    <section className="screen venue-menu-manage-screen">
      <BackLink to="/settings/venues">Voltar para Gestao de casas</BackLink>
      <header className="venue-menu-manage-header"><p className="eyebrow">GESTAO DA CASA</p><h1>Cardapio Essencial</h1><p>Publique uma selecao curta, clara e facil de manter.</p></header>
      <p className="feedback feedback-reserved" aria-live="polite">{feedback || " "}</p>
      <section className="admin-card venue-menu-ad-inventory-notice">
        <div className="venue-menu-ad-inventory-copy">
          <span className="venue-menu-panel-icon" aria-hidden="true"><Megaphone size={20} /></span>
          <div><p className="eyebrow">MODELO GRATUITO</p><h2>Publicidade administrada pelo 77Gira</h2><p>O Cardápio Essencial pode exibir publicidade selecionada e distribuída exclusivamente pelo 77Gira. A casa não escolhe, aprova ou bloqueia anunciantes e não recebe Patacos, remuneração ou participação de receita por essas exibições. A presença de uma campanha não representa parceria direta entre a marca e a casa.</p></div>
        </div>
        {adInventoryAccepted ? <div className="venue-menu-ad-inventory-accepted"><strong>Condição aceita</strong><small>Versão {menu.adInventoryPolicyVersion} · {new Date(menu.adInventoryAcceptedAt).toLocaleDateString("pt-BR")}</small></div> : <div className="venue-menu-ad-inventory-consent"><label><input type="checkbox" checked={acceptanceChecked} onChange={(event) => setAcceptanceChecked(event.target.checked)} /> Li e aceito as condições de publicidade do Cardápio Essencial.</label><button type="button" className="btn-primary" disabled={!acceptanceChecked || saveMenu.isPending} onClick={acceptAdInventoryTerms}>Confirmar condição</button></div>}
      </section>
      <section className="venue-menu-manage-bar">
        <div className="venue-menu-summary-count"><span className="venue-menu-panel-icon" aria-hidden="true"><ClipboardList size={19} /></span><div><strong>{activeItems.length}/30 itens</strong><small>{menu?.status === "published" ? "Cardapio publicado" : "Cardapio em rascunho"}</small></div></div>
        <div className="venue-menu-summary-status"><List size={19} aria-hidden="true" /><div><small>Status do cardápio</small><strong>{menu?.status === "published" ? "Publicado" : "Rascunho"}</strong></div></div>
        <label className="venue-menu-prices-control"><small>Exibir preços</small><span><input type="checkbox" checked={menu?.pricesVisible ?? true} onChange={(event) => saveMenu.mutate({ venueId, payload: { pricesVisible: event.target.checked } })} /> Sim</span></label>
        <button type="button" className="btn-primary" disabled={!adInventoryAccepted || saveMenu.isPending} onClick={publishMenu}>Publicar e marcar revisado</button>
      </section>
      <div className="venue-menu-manage-grid">
        <form className="admin-card venue-menu-form" onSubmit={submitItem}>
          <div className="venue-menu-section-heading"><SquarePlus size={20} aria-hidden="true" /><h2>{editingId ? "Editar item" : "Novo item"}</h2></div>
          <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} /></label>
          <label>Categoria<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{options.categories.map((value) => <option key={value} value={value}>{LABELS[value] || value}</option>)}</select></label>
          <label>Descricao<textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={240} /></label>
          <div className="form-grid-2"><label>Preco<input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0,00" /></label><label>Modalidade<select value={form.priceMode} onChange={(e) => setForm({ ...form, priceMode: e.target.value })}><option value="exact">Preco exato</option><option value="from">A partir de</option><option value="hidden">Oculto</option><option value="consultation">Sob consulta</option></select></label></div>
          <div className="form-grid-2"><label>Apresentação<select value={form.servingLabel || ""} onChange={(e) => setForm({ ...form, servingLabel: e.target.value })}><option value="">Não informar</option>{options.servings.map((value) => <option key={value} value={value}>{SERVING_LABELS[value] || value.replaceAll("_", " ")}</option>)}</select></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="published">Disponível</option><option value="unavailable">Indisponível</option><option value="draft">Rascunho</option></select></label></div>
          <fieldset className="venue-menu-tags"><legend>Características <small>até 4</small></legend><div>{options.tags.map((tag) => <label key={tag} className={form.tags.includes(tag) ? "active" : ""}><input type="checkbox" checked={form.tags.includes(tag)} onChange={() => toggleTag(tag)} disabled={!form.tags.includes(tag) && form.tags.length >= 4} />{TAG_LABELS[tag] || tag}</label>)}</div></fieldset>
          <label className="venue-menu-highlight"><input type="checkbox" checked={form.isHighlight} onChange={(e) => setForm({ ...form, isHighlight: e.target.checked })} /> Destacar este item no cardápio</label>
          <button type="submit" className="btn-primary">{editingId ? "Salvar alteracoes" : "Adicionar item"}</button>{editingId ? <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>Cancelar edicao</button> : null}
        </form>
        <section className="admin-card venue-menu-manage-list">
          <div className="venue-menu-list-heading">
            <div className="venue-menu-section-heading"><List size={20} aria-hidden="true" /><h2>Itens do cardápio</h2></div>
            <div className="venue-menu-list-tabs" role="tablist" aria-label="Filtrar itens">
              <button type="button" className={listView === "active" ? "active" : ""} onClick={() => setListView("active")}>Ativos <small>{activeItems.length}</small></button>
              <button type="button" className={listView === "archived" ? "active" : ""} onClick={() => setListView("archived")}>Arquivados <small>{archivedItems.length}</small></button>
            </div>
          </div>
          {!visibleItems.length ? <p className="empty">{listView === "archived" ? "Nenhum item arquivado." : "Adicione o primeiro item."}</p> : visibleItems.map((item, index) => (
            <article key={item.id} className="venue-menu-manage-item">
              <div><small>{LABELS[item.category]}</small><strong>{item.name}</strong><span>{item.status}{item.isHighlight ? " · destaque" : ""}</span></div>
              <div className="venue-menu-manage-actions">
                {listView === "active" ? <>
                  <button type="button" className="btn-secondary" aria-label={`Mover ${item.name} para cima`} disabled={index === 0 || reorderItems.isPending} onClick={() => moveItem(item.id, -1)}>↑</button>
                  <button type="button" className="btn-secondary" aria-label={`Mover ${item.name} para baixo`} disabled={index === activeItems.length - 1 || reorderItems.isPending} onClick={() => moveItem(item.id, 1)}>↓</button>
                  <button type="button" className="btn-secondary" onClick={() => edit(item)}>Editar</button>
                  <button type="button" className="btn-danger" onClick={() => handleArchive(item.id)}>Arquivar</button>
                </> : <button type="button" className="btn-secondary" disabled={restoreItem.isPending || activeItems.length >= 30} onClick={() => handleRestore(item.id)}>Restaurar como rascunho</button>}
              </div>
            </article>
          ))}
        </section>
      </div>
      <section className="admin-card venue-menu-csv-tools">
        <div className="venue-menu-csv-copy"><span className="venue-menu-panel-icon" aria-hidden="true"><FileSpreadsheet size={19} /></span><div><h2>Planilha do cardápio</h2><p>Use CSV UTF-8, compatível com Excel. A importação é validada antes de salvar e nunca substitui itens existentes.</p></div></div>
        <div className="venue-menu-csv-actions">
          <button type="button" className="btn-secondary" onClick={() => downloadVenueMenuCsv("modelo-cardapio-77gira.csv", [VENUE_MENU_TEMPLATE_ITEM])}>Baixar modelo CSV</button>
          <button type="button" className="btn-secondary" onClick={() => downloadVenueMenuCsv("cardapio-essencial.csv", menu?.items || [])} disabled={!menu?.items?.length}>Baixar cardápio</button>
          <label className="btn-primary venue-menu-file-button">Selecionar CSV<input type="file" accept=".csv,text/csv" onChange={handleCsvFile} /></label>
        </div>
        {importPreview ? <div className={`venue-menu-import-preview ${importPreview.errors.length ? "has-errors" : "is-valid"}`}>
          <strong>{importFileName}</strong><p>{importPreview.items.length} item(ns) encontrado(s).</p>
          {importPreview.errors.length ? <ul>{importPreview.errors.map((error) => <li key={error}>{error}</li>)}</ul> : <p>Arquivo válido. Revise a quantidade e confirme a importação.</p>}
          <div className="venue-menu-csv-actions"><button type="button" className="btn-primary" disabled={Boolean(importPreview.errors.length) || importItems.isPending} onClick={confirmCsvImport}>Confirmar importação</button><button type="button" className="btn-secondary" onClick={() => { setImportPreview(null); setImportFileName(""); }}>Cancelar</button></div>
        </div> : null}
      </section>
    </section>
  );
}
