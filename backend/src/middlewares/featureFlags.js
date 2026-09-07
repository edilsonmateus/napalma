export function isFeatureEnabled(name, { defaultEnabled = false } = {}) {
  const raw = String(process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return defaultEnabled;
  return raw === "true";
}

export function requireFeatureFlag(name, options = {}) {
  return (_req, res, next) => {
    if (!isFeatureEnabled(name, options)) {
      return res.status(404).json({
        error: "feature_not_available",
        message: "Recurso indisponivel."
      });
    }
    return next();
  };
}
