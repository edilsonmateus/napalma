import { AD_PLACEMENTS } from "../config/adPlacements.js";

export const MILIPATACOS_PER_PATACO = 1000n;
export const AD_PRICING_VERSION = "2026-08-v1";

export function milipatacosToPatacos(value) {
  return Number(BigInt(value || 0)) / Number(MILIPATACOS_PER_PATACO);
}

export function patacosToMilipatacos(value) {
  if (!Number.isInteger(value) || value < 0) throw new Error("Valor de patacos inválido.");
  return BigInt(value) * MILIPATACOS_PER_PATACO;
}

export function pricingForSlot(slot) {
  const placement = AD_PLACEMENTS.find((item) => item.key === slot);
  const rules = placement?.commercialRules;
  if (!rules?.impressionCostMilipatacos) return null;
  return {
    slot,
    modality: rules.modality,
    cpmPatacos: rules.cpmPatacos,
    impressionCostMilipatacos: rules.impressionCostMilipatacos
  };
}

export function pricingSnapshotForSlots(slots) {
  const pricing = slots.map(pricingForSlot).filter(Boolean);
  return {
    version: AD_PRICING_VERSION,
    currency: "BRL",
    unit: "milipataco",
    billingModel: "valid_impression_cpm",
    slots: Object.fromEntries(pricing.map((item) => [item.slot, item]))
  };
}

export function campaignImpressionCost(campaign, slot) {
  const snapshot = campaign?.pricingSnapshot;
  const frozen = snapshot && typeof snapshot === "object" ? snapshot.slots?.[slot] : null;
  return BigInt(frozen?.impressionCostMilipatacos || pricingForSlot(slot)?.impressionCostMilipatacos || 0);
}
