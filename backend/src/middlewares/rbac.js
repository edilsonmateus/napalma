export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Seu perfil nao possui permissao para esta acao.",
        role: req.userRole
      });
    }
    next();
  };
}
