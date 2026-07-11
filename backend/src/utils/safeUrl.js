import { z } from "zod";

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch (_error) {
    return false;
  }
}

/** External destinations must be browser-safe HTTP(S) URLs. */
export const safeHttpUrl = z.string().trim().url().max(2048).refine(isHttpUrl, {
  message: "Use uma URL HTTP ou HTTPS valida."
});
