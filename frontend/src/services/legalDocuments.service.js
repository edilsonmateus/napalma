import { api } from "./api";

export async function getMyLegalDocuments() {
  const { data } = await api.get("/me/legal-documents");
  return data;
}

export async function getMyLegalRequirements(context) {
  const { data } = await api.get("/me/legal-documents/requirements", { params: { context } });
  return data;
}

export async function acceptMyLegalDocuments({ context, versionIds, source = "account_settings" }) {
  const { data } = await api.post("/me/legal-documents/acceptances", { context, versionIds, source });
  return data;
}

export async function getMyLegalSignatures() {
  const { data } = await api.get("/me/legal-signatures");
  return data.items || [];
}

export async function getMyLegalSignature(participantId) {
  const { data } = await api.get(`/me/legal-signatures/${participantId}`);
  return data.item;
}

export async function requestMyLegalSignatureCode(participantId) {
  const { data } = await api.post(`/me/legal-signatures/${participantId}/request-code`);
  return data;
}

export async function confirmMyLegalSignature(participantId, payload) {
  const { data } = await api.post(`/me/legal-signatures/${participantId}/confirm`, payload);
  return data;
}

export async function declineMyLegalSignature(participantId, reason) {
  const { data } = await api.post(`/me/legal-signatures/${participantId}/decline`, { reason });
  return data;
}
