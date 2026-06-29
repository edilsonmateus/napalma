export function isFeatureEnabled(name) {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

export function requireFeatureFlag(name) {
  return (_req, res, next) => {
    if (!isFeatureEnabled(name)) {
      return res.status(404).json({
        error: "feature_not_available",
        message: "Recurso indisponivel."
      });
    }
    return next();
  };
}
