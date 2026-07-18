import { api } from "./api";

export async function getOperationsNotificationsOverview() {
  const { data } = await api.get("/admin/operations/notifications");
  return data.item;
}

export async function getOperationsModerationQueue() {
  const { data } = await api.get("/admin/operations/moderation");
  return data.items || [];
}

export async function getOperationsSettingsOverview() {
  const { data } = await api.get("/admin/operations/settings");
  return data.item;
}

export async function listOperationsAccessGrants() {
  const { data } = await api.get("/admin/operations/access-grants");
  return data.items || [];
}

export async function setOperationsAccessGrant(payload) {
  const { data } = await api.put("/admin/operations/access-grants", payload);
  return data;
}

export async function getOperationsWebAuthnStatus() {
  const { data } = await api.get("/admin/operations/webauthn/status");
  return data;
}

export async function enrollOperationsWebAuthn() {
  const { startRegistration } = await import("@simplewebauthn/browser");
  const { data: options } = await api.get("/admin/operations/webauthn/registration-options");
  const response = await startRegistration({ optionsJSON: options });
  const { data } = await api.post("/admin/operations/webauthn/registration-verify", response);
  return data;
}

export async function confirmOperationsWebAuthn() {
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const { data: options } = await api.get("/admin/operations/webauthn/confirmation-options");
  const response = await startAuthentication({ optionsJSON: options });
  const { data } = await api.post("/admin/operations/webauthn/confirmation-verify", response);
  return data;
}
