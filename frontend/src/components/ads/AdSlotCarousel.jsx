import { useEffect, useId, useRef, useState } from "react";
import AdSlotCard from "./AdSlotCard";

export default function AdSlotCarousel({ carousel }) {
  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackId = useId();
  const items = carousel?.items || [];

  useEffect(() => {
    setActiveIndex(0);
  }, [carousel?.carouselId]);

  if (items.length < 2) return null;
  const move = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const width = track.querySelector(".ad-slot-carousel-item")?.getBoundingClientRect().width || track.clientWidth;
    track.scrollBy({ left: direction * (width + 12), behavior: "smooth" });
  };
  const onScroll = () => {
    const track = trackRef.current;
    const width = track?.querySelector(".ad-slot-carousel-item")?.getBoundingClientRect().width || 1;
    setActiveIndex(Math.max(0, Math.min(items.length - 1, Math.round(track.scrollLeft / (width + 12)))));
  };

  return (
    <section className="ad-slot-carousel" aria-label="Publicidade patrocinada">
      <div id={trackId} className="ad-slot-carousel-track" ref={trackRef} onScroll={onScroll}>
        {items.map((ad) => (
          <div className="ad-slot-carousel-item" key={ad.deliveryToken || ad.creativeId}>
            <AdSlotCard ad={ad} slot="explore_between_days_carousel" />
          </div>
        ))}
      </div>
      <div className="ad-slot-carousel-footer">
        <span aria-live="polite">{activeIndex + 1} de {items.length}</span>
        <div className="ad-slot-carousel-controls">
          <button type="button" aria-controls={trackId} aria-label="Peça anterior" disabled={activeIndex === 0} onClick={() => move(-1)}>←</button>
          <button type="button" aria-controls={trackId} aria-label="Próxima peça" disabled={activeIndex >= items.length - 1} onClick={() => move(1)}>→</button>
        </div>
      </div>
    </section>
  );
}
