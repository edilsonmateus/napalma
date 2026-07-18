/**
 * Operations access is independent from public account roles. The global admin
 * retains full access; delegated operators receive only the scopes explicitly
 * granted to their own user record.
 */
export function hasOperationScope(user, scope) {
  return user?.role === "admin" || Boolean(user?.operationScopes?.includes(scope));
}

export function hasAnyOperationScope(user) {
  return user?.role === "admin" || Boolean(user?.operationScopes?.length);
}

export function requireOperationScope(scope) {
  return (req, res, next) => {
    if (!hasOperationScope(req.user, scope)) {
      return res.status(403).json({ error: "operations_scope_required", message: "Seu acesso interno não inclui este módulo operacional." });
    }
    return next();
  };
}

export function requireAnyOperationScope(req, res, next) {
  if (!hasAnyOperationScope(req.user)) {
    return res.status(403).json({ error: "operations_access_required", message: "Seu perfil não possui acesso à Central de Operações." });
  }
  return next();
}
