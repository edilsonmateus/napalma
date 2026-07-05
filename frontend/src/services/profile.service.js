import { api } from "./api";

export async function uploadProfileAvatar(file) {
  const body = new FormData();
  body.append("file", file);
  const { data } = await api.post("/me/profile/avatar", body, { headers: { "Content-Type": "multipart/form-data" } });
  return data.item;
}
