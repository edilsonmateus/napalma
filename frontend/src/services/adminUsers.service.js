import { api } from "./api";

export async function listCommonUsers(q = "") {
  const { data } = await api.get("/admin/users", { params: q ? { q } : {} });
  return data.items || [];
}

export async function createCommonUser(payload) {
  const { data } = await api.post("/admin/users", payload);
  return data.item;
}

export async function setReservedUsernamePermission(id, canUseReservedBrandUsername) {
  const { data } = await api.patch(`/admin/users/${id}/reserved-username-permission`, { canUseReservedBrandUsername });
  return data.item;
}
