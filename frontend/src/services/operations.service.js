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

export async function listOperationsStrategicPartners() {
  const { data } = await api.get("/admin/operations/partners");
  return data.items || [];
}

export async function createOperationsStrategicPartner(payload) {
  const { data } = await api.post("/admin/operations/partners", payload);
  return data.item;
}

export async function updateOperationsStrategicPartner(id, payload) {
  const { data } = await api.patch(`/admin/operations/partners/${id}`, payload);
  return data.item;
}

export async function uploadOperationsStrategicPartnerLogo(file, name) {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", "partners");
  form.append("name", name || file.name);
  const { data } = await api.post("/admin/operations/partners/uploads/logo", form);
  return data.item;
}

export async function listOperationsCommunicationMessages(params = {}) {
  const { data } = await api.get("/admin/operations/communications/messages", { params });
  return data;
}

export async function listOperationsCommunicationRecipients(params = {}) {
  const { data } = await api.get("/admin/operations/communications/recipients", { params });
  return data;
}

export async function listOperationsCommunicationTemplates() {
  const { data } = await api.get("/admin/operations/communications/templates");
  return data;
}

export async function createOperationsCommunicationMessage(payload) {
  const { data } = await api.post("/admin/operations/communications/messages", payload);
  return data;
}

export async function updateOperationsCommunicationMessage(id, payload) {
  const { data } = await api.patch(`/admin/operations/communications/messages/${id}`, payload);
  return data;
}

export async function sendOperationsCommunicationMessage(id) {
  const { data } = await api.post(`/admin/operations/communications/messages/${id}/send`);
  return data;
}

export async function listOperationsLegalDocuments() {
  const { data } = await api.get("/admin/operations/documents");
  return data.items || [];
}

export async function bootstrapOperationsLegalDocuments() {
  const { data } = await api.post("/admin/operations/documents/bootstrap");
  return data.items || [];
}

export async function createOperationsLegalDocument(payload) {
  const { data } = await api.post("/admin/operations/documents", payload);
  return data.item;
}

export async function createOperationsLegalDocumentVersion(id, payload) {
  const { data } = await api.post(`/admin/operations/documents/${id}/versions`, payload);
  return data.item;
}

export async function transitionOperationsLegalDocumentVersion(documentId, versionId, payload) {
  const { data } = await api.patch(`/admin/operations/documents/${documentId}/versions/${versionId}/status`, payload);
  return data.item;
}

export async function getOperationsLegalDocumentVersionImpact(documentId, versionId) {
  const { data } = await api.get(`/admin/operations/documents/${documentId}/versions/${versionId}/impact`);
  return data.item;
}

export async function listOperationsLegalSignatures() {
  const { data } = await api.get("/admin/operations/signatures");
  return data.items || [];
}

export async function createOperationsLegalSignature(payload) {
  const { data } = await api.post("/admin/operations/signatures", payload);
  return data.item;
}

export async function cancelOperationsLegalSignature(id, reason) {
  const { data } = await api.post(`/admin/operations/signatures/${id}/cancel`, { reason });
  return data;
}

export async function resendOperationsLegalSignatureInvitation(id) {
  const { data } = await api.post(`/admin/operations/signatures/${id}/resend`);
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
