import { AD_PLACEMENTS } from "../config/adPlacements.js";

const RATIO_TOLERANCE = 0.12;

export function creativeFormatIssue(creative) {
  const placement = AD_PLACEMENTS.find((item) => item.legacySlot === creative?.slot);
  if (!placement) return "O posicionamento deste criativo não é reconhecido.";
  if (!creative?.width || !creative?.height) {
    return "Não foi possível confirmar as dimensões do arquivo deste criativo.";
  }

  const expectedRatio = placement.recommendedWidth / placement.recommendedHeight;
  const actualRatio = Number(creative.width) / Number(creative.height);
  if (Math.abs(actualRatio - expectedRatio) / expectedRatio <= RATIO_TOLERANCE) return null;

  return `Este posicionamento exige um arquivo na proporção ${placement.aspectRatio} (${placement.recommendedWidth} × ${placement.recommendedHeight} px).`;
}
