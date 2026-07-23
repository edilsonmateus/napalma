import { api } from "./api";

export async function login(payload) {
  const { data } = await api.post("/auth/login", payload);
  return data;
}

export async function loginAsLocalAdmin() {
  const { data } = await api.post("/auth/dev/admin");
  return data;
}

export async function register(payload) {
  const { data } = await api.post("/auth/register", payload);
  return data;
}

export async function requestPasswordReset(email) {
  const { data } = await api.post("/auth/password/forgot", { email });
  return data;
}

export async function resetPassword(payload) {
  const { data } = await api.post("/auth/password/reset", payload);
  return data;
}

export async function me() {
  const { data } = await api.get("/auth/me");
  return data.user;
}

export async function logout(payload) {
  await api.post("/auth/logout", payload);
}
