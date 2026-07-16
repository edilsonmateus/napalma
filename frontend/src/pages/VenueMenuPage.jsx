import { Bookmark, Heart, ThumbsUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdSlotCard from "../components/ads/AdSlotCard";
import BackLink from "../components/common/BackLink";
import { useAdDeliveryQuery } from "../hooks/useEventsQuery";
import { useVenueMenuInteractionMutation, useVenueMenuQuery } from "../hooks/useVenueMenu";
import { trackAnalyticsEvent } from "../services/analytics.service";
import { useAuthStore } from "../store/authStore";

const CATEGORY_LABELS = {
  petiscos: "Petiscos", porcoes: "Porções", pratos: "Pratos", lanches: "Lanches", sobremesas: "Sobremesas",
  cervejas: "Cervejas", drinks: "Drinks", doses: "Doses", vinhos_espumantes: "Vinhos e espumantes", sem_alcool: "Sem álcool"
};
const SERVING_LABELS = {
  individual: "Individual", serve_2: "Serve duas pessoas", serve_3_ou_mais: "Serve três ou mais pessoas",
  unidade: "Unidade", dose: "Dose", garrafa: "Garrafa", lata: "Lata", porcao: "Porção", jarra: "Jarra", balde: "Balde"
};

function priceLabel(item, pricesVisible) {
  if (!pricesVisible || item.priceMode === "hidden") return null;
  if (item.priceMode === "consultation") return "Consulte";
  if (item.priceCents == null) return null;
  const value = (item.priceCents / 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  return item.priceMode === "from" ? `A partir de ${value}` : value;
}

function MenuAction({ active, icon: Icon, children, count, onClick, disabled }) {
  return (
    <button type="button" className={`venue-menu-action ${active ? "active" : ""}`} onClick={onClick} disabled={disabled}>
      <Icon size={15} /><span>{children}</span>{count ? <small>{count}</small> : null}
    </button>
  );
}

export default function VenueMenuPage() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data: menu, isLoading, isError, error } = useVenueMenuQuery(venueId);
  const interaction = useVenueMenuInteractionMutation();
  const { data: sponsor } = useAdDeliveryQuery("venue_menu_sponsor", Boolean(menu), { venueId });
  const [feedback, setFeedback] = useState("");
  const grouped = useMemo(() => {
    const result = new Map();
    for (const item of menu?.items || []) {
      if (!result.has(item.category)) result.set(item.category, []);
      result.get(item.category).push(item);
    }
    return result;
  }, [menu]);

  useEffect(() => {
    if (!menu?.id) return;
    trackAnalyticsEvent("venue_menu_view", { venueId, source: "venue_menu" });
  }, [menu?.id, venueId]);

  async function toggle(item, type) {
    if (!user) {
      navigate("/login", { state: { from: `/venues/${venueId}/menu` } });
      return;
    }
    const active = item.viewerInteractions.includes(type);
    setFeedback("");
    try {
      await interaction.mutateAsync({ venueId, itemId: item.id, type, active: !active });
      trackAnalyticsEvent(active ? "venue_menu_interaction_remove" : "venue_menu_interaction_add", {
        venueId,
        source: "venue_menu",
        metadata: { itemId: item.id, type }
      });
      setFeedback(active ? "Interação removida." : "Interação salva.");
    } catch (_error) {
      setFeedback("Não foi possível atualizar agora.");
    }
  }

  if (isLoading) return <p className="empty">Carregando cardápio...</p>;
  if (isError) return (
    <section className="screen venue-menu-screen">
      <BackLink to={`/venues/${venueId}`}>Voltar para a casa</BackLink>
      <div className="empty empty-highlight">
        <h2>Cardápio ainda não publicado</h2>
        <p>{error?.response?.data?.message || "A casa ainda está preparando esta experiência."}</p>
      </div>
    </section>
  );

  return (
    <section className="screen venue-menu-screen">
      <BackLink to={`/venues/${venueId}`}>Voltar para {menu.venue.name}</BackLink>
      <header className="venue-menu-header">
        <p className="eyebrow">CARDÁPIO ESSENCIAL</p>
        <h1>{menu.venue.name}</h1>
        <p>{[menu.venue.neighborhood, menu.venue.region].filter(Boolean).join(" · ")}</p>
        {menu.reviewedAt ? <small>Preços revisados em {new Date(menu.reviewedAt).toLocaleDateString("pt-BR")}</small> : <small>Consulte a casa para confirmar disponibilidade e valores.</small>}
      </header>

      {sponsor ? (
        <section className="venue-menu-sponsor" aria-label="Publicidade no cardápio">
          <span className="venue-menu-ad-disclosure">PUBLICIDADE</span>
          <p className="venue-menu-sponsor-label">Cardápio apresentado por:</p>
          <AdSlotCard ad={sponsor} slot="venue_menu_sponsor" venueId={venueId} />
          <p className="venue-menu-sponsor-disclaimer">Esta publicidade é veiculada pelo 77Gira e não representa necessariamente uma parceria direta entre a marca e a casa.</p>
        </section>
      ) : null}

      <p className="feedback feedback-reserved" aria-live="polite">{feedback || " "}</p>
      <div className="venue-menu-categories">
        {[...grouped.entries()].map(([category, items]) => (
          <section key={category} className="venue-menu-category">
            <h2>{CATEGORY_LABELS[category] || category}</h2>
            <div className="venue-menu-items">
              {items.map((item) => {
                const unavailable = item.status === "unavailable";
                const price = priceLabel(item, menu.pricesVisible);
                return (
                  <article key={item.id} className={`venue-menu-item ${unavailable ? "unavailable" : ""} ${item.isHighlight ? "highlight" : ""}`}>
                    <div className="venue-menu-item-copy">
                      <div className="venue-menu-item-heading"><h3>{item.name}{item.isHighlight ? <small>Destaque da casa</small> : null}</h3>{price ? <strong>{price}</strong> : null}</div>
                      {item.description ? <p>{item.description}</p> : null}
                      <div className="venue-menu-item-meta">
                        {item.servingLabel ? <span className="serving">{SERVING_LABELS[item.servingLabel]}</span> : null}
                        {unavailable ? <span className="availability">Indisponível agora</span> : null}
                        {item.tags.map((tag) => <span className="attribute" key={tag}>{tag.replaceAll("_", " ")}</span>)}
                      </div>
                    </div>
                    <div className="venue-menu-actions">
                      <MenuAction active={item.viewerInteractions.includes("want_to_try")} icon={Heart} count={item.publicSignals.wantToTry} onClick={() => toggle(item, "want_to_try")} disabled={interaction.isPending}>Quero provar</MenuAction>
                      <MenuAction active={item.viewerInteractions.includes("recommend")} icon={ThumbsUp} count={item.publicSignals.recommends} onClick={() => toggle(item, "recommend")} disabled={interaction.isPending}>Recomendo</MenuAction>
                      <MenuAction active={item.viewerInteractions.includes("save")} icon={Bookmark} count={item.publicSignals.saves} onClick={() => toggle(item, "save")} disabled={interaction.isPending}>Salvar</MenuAction>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
