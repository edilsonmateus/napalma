export default function VerifiedBadge({ title = "Perfil verificado", className = "", iconSrc = "/verificado.svg" }) {
  return (
    <span className={`verified-badge-icon ${className}`.trim()} title={title} aria-label={title}>
      <img src={iconSrc} alt="" aria-hidden="true" />
    </span>
  );
}
