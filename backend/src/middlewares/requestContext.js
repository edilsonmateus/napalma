import { randomUUID } from "node:crypto";

/** A server-generated correlation ID; never trust a client supplied value. */
export function requestContext(req, res, next) {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}
