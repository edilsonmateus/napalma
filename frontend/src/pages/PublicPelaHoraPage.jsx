import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicPelaHoraShare } from "../services/events.service";
import { resolveMediaUrl } from "../services/api";

function formatDate(value) {
  return new Date(value).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function formatHour(value) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function PublicPelaHoraPage() {
  const { token } = useParams();
  const [plan, setPlan] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let active = true;
    getPublicPelaHoraShare(token)
      .then((item) => {
        if (!active) return;
        setPlan(item);
        setState("ready");
      })
      .catch(() => active && setState("unavailable"));
    return () => { active = false; };
  }, [token]);

  if (state === "loading") {
    return <main className="public-itinerary-screen"><p className="public-itinerary-loading">Abrindo o roteiro...</p></main>;
  }

  if (state !== "ready" || !plan) {
    return <main className="public-itinerary-screen"><section className="public-itinerary-unavailable"><img src="/assets/brand/icon_mono_77Gira.svg" alt="77Gira"/><h1>Este roteiro não está disponível</h1><p>O link pode ter expirado ou sido desativado por quem o compartilhou.</p><Link to="/explore" className="public-itinerary-open">Conhecer o 77Gira</Link></section></main>;
  }

  const firstImage = plan.items.find((item) => item.imageUrl)?.imageUrl;
  const eventCount = plan.items.length;

  return (
    <main className="public-itinerary-screen">
      <section className="public-itinerary-card">
        <header className="public-itinerary-hero">
          <img src="/assets/brand/logoBase77Gira.svg" alt="77Gira" className="public-itinerary-logo" />
          <span>Pela Hora</span>
          {firstImage ? <img src={resolveMediaUrl(firstImage)} alt="" className="public-itinerary-hero-image" /> : null}
          <div className="public-itinerary-hero-copy">
            <p>ROTEIRO COMPARTILHADO</p>
            <h1>{plan.title}</h1>
            <strong>{formatDate(plan.date)}</strong>
          </div>
        </header>

        <div className="public-itinerary-summary">
          <span>{eventCount} {eventCount === 1 ? "samba" : "sambas"}</span>
          <span>{plan.totalTransitMinutes} min em deslocamento</span>
          <span>Feito para curtir sem correria</span>
        </div>

        <section className="public-itinerary-list" aria-label="Programação do roteiro">
          <h2>Seu Pela Hora</h2>
          {plan.items.map((item, index) => (
            <article key={item.position} className="public-itinerary-row">
              <time>{formatHour(item.startsAt)}</time>
              <div className="public-itinerary-track" aria-hidden="true">
                <i />
                {index < plan.items.length - 1 ? <b /> : null}
              </div>
              <div className="public-itinerary-event">
                <strong>{item.title}</strong>
                {item.artist ? <span>{item.artist}</span> : null}
                <small>{item.venue}{item.region ? ` · ${item.region}` : ""}</small>
                {index < plan.items.length - 1 && item.transitMinutesFromPrev > 0 ? <em>Próximo deslocamento: {plan.items[index + 1]?.transitMinutesFromPrev || item.transitMinutesFromPrev} min</em> : null}
              </div>
            </article>
          ))}
        </section>

        <footer className="public-itinerary-footer">
          <p>Quer montar o seu próprio roteiro de sambas?</p>
          <Link to="/explore" className="public-itinerary-open">Abrir no 77Gira</Link>
        </footer>
      </section>
    </main>
  );
}
