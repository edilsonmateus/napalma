import { api } from "./api";

export async function uploadAdCreativeAsset({ file, campaignId, slot }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("campaignId", campaignId);
  formData.append("slot", slot);
  const { data } = await api.post("/ads/uploads/creative", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data.item;
}
