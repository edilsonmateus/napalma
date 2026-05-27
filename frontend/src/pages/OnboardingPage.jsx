import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import onboardingSlides from "../data/onboardingSlides";
import { ONBOARDING_STORAGE_KEY } from "../utils/onboarding";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const total = onboardingSlides.length;
  const slide = onboardingSlides[activeIndex];
  const isLast = activeIndex === total - 1;

  const indicators = useMemo(
    () => onboardingSlides.map((item, idx) => ({ id: item.id, active: idx === activeIndex })),
    [activeIndex]
  );

  function finishOnboarding() {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch (_error) {
      // no-op
    }
    navigate("/explore", { replace: true });
  }

  function nextStep() {
    if (isLast) {
      finishOnboarding();
      return;
    }
    setActiveIndex((prev) => prev + 1);
  }

  return (
    <section className="onboarding-screen" style={{ background: slide.background }}>
      <div className="onboarding-content">
        <div className="onboarding-icon" aria-hidden="true">
          {slide.icon}
        </div>
        <h1>{slide.title}</h1>
        <p>{slide.description}</p>

        <div className="onboarding-indicators" aria-label="Indicador de paginas">
          {indicators.map((indicator) => (
            <span key={indicator.id} className={`onboarding-dot ${indicator.active ? "active" : ""}`} />
          ))}
        </div>

        <div className="onboarding-actions">
          {!isLast ? (
            <button type="button" className="chip" onClick={finishOnboarding}>
              Pular
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="btn-primary" onClick={nextStep}>
            {isLast ? "Comecar" : "Proximo"}
          </button>
        </div>
      </div>
    </section>
  );
}
