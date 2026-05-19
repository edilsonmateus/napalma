export default function VerifiedBadge({ title = "Perfil verificado", className = "" }) {
  return (
    <span className={`verified-badge-icon ${className}`.trim()} title={title} aria-label={title}>
      <img src="/verificado.svg" alt="" aria-hidden="true" />
    </span>
  );
}
