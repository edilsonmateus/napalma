/** Prevent browsers and intermediary proxies from caching API responses that
 * can contain session tokens, account data or privacy exports. */
export function noStore(_req, res, next) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  next();
}
