import { api } from "./api";

export async function getMyPrivacyOverview() {
  const { data } = await api.get("/me/privacy");
  return data;
}

export async function setPrivacyConsent(purpose, isGranted) {
  const { data } = await api.post(`/me/privacy/consents/${purpose}`, { isGranted, policyVersion: "1.2" });
  return data.item;
}

export async function createPrivacyRequest(payload) {
  const { data } = await api.post("/me/privacy/requests", payload);
  return data.item;
}

export async function listPrivacyRequests(status) {
  const { data } = await api.get("/admin/privacy-requests", { params: status ? { status } : {} });
  return data.items || [];
}

export async function updatePrivacyRequest(id, payload) {
  const { data } = await api.patch(`/admin/privacy-requests/${id}`, payload);
  return data.item;
}

export async function listOperationsPrivacyRequests(params = {}) {
  const { data } = await api.get("/admin/operations/privacy-requests", { params });
  return data.items || [];
}

export async function getOperationsPrivacyRequestDetail(id) {
  const { data } = await api.get(`/admin/operations/privacy-requests/${id}`);
  return data.item;
}

export async function actOnOperationsPrivacyRequest(id, payload) {
  const { data } = await api.post(`/admin/operations/privacy-requests/${id}/actions`, payload);
  return data.item;
}

export async function listAuditLogs(params = {}) {
  const { data } = await api.get("/admin/audit-logs", { params });
  return data.items || [];
}

export async function getPrivacyRetentionPreview() {
  const { data } = await api.get("/admin/privacy-retention/preview");
  return data.item;
}

export async function getSecurityReadiness() {
  const { data } = await api.get("/admin/security-readiness");
  return data.item;
}

export async function downloadPrivacyExport(currentPassword) {
  const response = await api.post("/me/privacy/export", { currentPassword }, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "77gira-meus-dados.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function createDeletionRequest(currentPassword) {
  const { data } = await api.post("/me/privacy/deletion-request", { currentPassword, confirmation: "EXCLUIR MINHA CONTA" });
  return data;
}
