import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import onboardingSlides from "../data/onboardingSlides";
import { markOnboardingAsSeen } from "../utils/onboarding";

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
    markOnboardingAsSeen();
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
    <section
      className="onboarding-screen"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(11, 9, 16, 0.52) 0%, rgba(11, 9, 16, 0.82) 58%, rgba(11, 9, 16, 0.92) 100%), url(${slide.bgImage})`
      }}
    >
      <div className="onboarding-content">
        <div className="onboarding-icon" aria-hidden="true">
          {slide.icon}
        </div>
        <h1>{slide.title}</h1>
        <p>{slide.description}</p>

        <div className="onboarding-indicators" role="group" aria-label={`Etapa ${activeIndex + 1} de ${total}`}>
          {indicators.map((indicator) => (
            <span key={indicator.id} className={`onboarding-dot ${indicator.active ? "active" : ""}`} aria-hidden="true" />
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
            {isLast ? "Começar" : "Próximo"}
          </button>
        </div>
      </div>
    </section>
  );
}
