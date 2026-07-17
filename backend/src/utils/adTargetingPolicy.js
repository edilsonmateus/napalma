import { AdSlot } from "@prisma/client";
import { z } from "zod";

const targetText = z.string().trim().min(2).max(120);
const campaignObjective = z.enum([
  "brand_campaign",
  "boost_event",
  "boost_venue",
  "agency",
  "other"
]);

/** Only broad, non-sensitive context is allowed in the current Ads product.
 * Adding age, gender, health, religion, precise location or free-form audience
 * attributes must go through privacy/governance review first. */
export const adTargetingSchema = z.object({
  // Campaign metadata is deliberately enumerated: it supports the guided
  // workspace without introducing free-form or sensitive audience data.
  objective: campaignObjective.optional(),
  slots: z.array(z.nativeEnum(AdSlot)).max(Object.keys(AdSlot).length).optional(),
  city: targetText.optional(),
  cities: z.array(targetText).min(1).max(20).optional(),
  region: targetText.optional(),
  regions: z.array(targetText).min(1).max(20).optional(),
  venueId: z.string().uuid().optional(),
  venueIds: z.array(z.string().uuid()).min(1).max(50).optional(),
  dailyImpressionCap: z.number().int().min(1).max(1_000_000).optional()
}).strict();
