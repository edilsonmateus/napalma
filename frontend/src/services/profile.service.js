import { api } from "./api";

export async function uploadProfileAvatar(file) {
  const body = new FormData();
  body.append("file", file);
  const { data } = await api.post("/me/profile/avatar", body, { headers: { "Content-Type": "multipart/form-data" } });
  return data.item;
}

export async function updateProfileLocation(payload) {
  const { data } = await api.patch("/me/profile/location", payload);
  return data.item;
}

export async function updateProfileDetails(payload) {
  const { data } = await api.patch("/me/profile", payload);
  return data.item;
}

export async function updateProfilePassword(payload) {
  await api.patch("/me/profile/password", payload);
}

export async function revokeProfileSessions(currentPassword) {
  const { data } = await api.post("/me/security/revoke-sessions", { currentPassword });
  return data;
}
