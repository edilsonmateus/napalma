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

export function requestLegalAcceptance({ context, requirements }) {
  if (!Array.isArray(requirements) || !requirements.length) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener("77gira:legal-acceptance-complete", handleComplete);
      window.removeEventListener("77gira:legal-acceptance-cancelled", handleCancel);
    };
    const handleComplete = (event) => {
      if (event.detail?.context !== context) return;
      cleanup();
      resolve();
    };
    const handleCancel = (event) => {
      if (event.detail?.context !== context) return;
      cleanup();
      reject(new Error("legal_acceptance_cancelled"));
    };

    window.addEventListener("77gira:legal-acceptance-complete", handleComplete);
    window.addEventListener("77gira:legal-acceptance-cancelled", handleCancel);
    window.dispatchEvent(new CustomEvent("77gira:legal-acceptance-required", { detail: { context, requirements } }));
  });
}

export async function retryAfterLegalAcceptance(context, operation) {
  try {
    return await operation();
  } catch (error) {
    const response = error?.response?.data;
    if (error?.response?.status !== 428 || response?.error !== "legal_acceptance_required") throw error;
    await requestLegalAcceptance({
      context: response.context || context,
      requirements: response.requirements || []
    });
    return operation();
  }
}

export async function getMyLegalSignatures() {
  const { data } = await api.get("/me/legal-signatures");
  return data.items || [];
}

export async function getMyLegalSignature(participantId) {
  const { data } = await api.get(`/me/legal-signatures/${participantId}`);
  return data.item;
}

export async function requestMyLegalSignatureCode(participantId, payload) {
  const { data } = await api.post(`/me/legal-signatures/${participantId}/request-code`, payload);
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
