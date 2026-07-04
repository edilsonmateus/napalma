import { AD_PLACEMENTS } from "../config/adPlacements.js";

export function listAdPlacements(_req, res) {
  return res.json({ items: AD_PLACEMENTS });
}
