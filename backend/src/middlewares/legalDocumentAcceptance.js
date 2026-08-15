import {
  audienceForLegalContext,
  getMissingLegalRequirements,
  legalRequirementError
} from "../services/legalAcceptance.service.js";

// Active document versions are the only ones that can block an action. This
// keeps the rollout safe: drafts and archived versions never affect a user.
export function requireLegalDocumentAcceptance(contextOrResolver) {
  return async (req, res, next) => {
    try {
      const context = typeof contextOrResolver === "function"
        ? contextOrResolver(req)
        : contextOrResolver;
      const audience = audienceForLegalContext(req.user, context);
      const requirements = await getMissingLegalRequirements({
        userId: req.user.id,
        audience,
        context
      });

      if (requirements.length) {
        return legalRequirementError(res, requirements, { context, audience });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
