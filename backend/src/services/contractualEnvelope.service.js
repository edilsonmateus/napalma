// This module is deliberately pure: it contains the rules that will later be
// used by the protected API, but it does not create, change or expose an
// envelope by itself. Keeping it isolated prevents any change to the claim
// signature path while the contractual flow is being homologated.

const CONTRACT_FIELD_TOKENS = Object.freeze({
  RAZAO_SOCIAL_CONTRAPARTE: "legalName",
  CNPJ_CONTRAPARTE: "taxId",
  SEDE_CONTRAPARTE: "registeredAddress",
  REPRESENTANTE_CONTRAPARTE: "representativeName",
  QUALIDADE_REPRESENTANTE: "representativeCapacity",
  EMAIL_SIGNATARIO: "signatoryEmail"
});

const REQUIRED_CONTRACT_FIELDS = Object.freeze(Object.values(CONTRACT_FIELD_TOKENS));
const TOKEN_PATTERN = /{{([A-Z0-9_]+)}}/g;

export const CONTRACTUAL_ISSUE_POLICIES = Object.freeze({
  advertising_contract: Object.freeze({
    documentKey: "contrato-base-publicidade",
    documentCategory: "advertising_terms",
    audience: "advertiser",
    completionMode: "proposal_acceptance",
    feature: "advertising"
  }),
  partnership_contract: Object.freeze({
    documentKey: "contrato-base-parceria-patrocinio",
    documentCategory: "partnership_terms",
    audience: "strategic_partner",
    completionMode: "counterpart_then_ratification",
    feature: "partnership"
  })
});

function asContractText(value, label, maxLength) {
  if (typeof value !== "string") throw new ContractualEnvelopeValidationError(`${label}_required`);
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized) throw new ContractualEnvelopeValidationError(`${label}_required`);
  if (normalized.length > maxLength) throw new ContractualEnvelopeValidationError(`${label}_too_long`);
  // Tabs and line breaks are allowed in an address; other control characters
  // could make a stored snapshot or a later renderer ambiguous.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(normalized)) {
    throw new ContractualEnvelopeValidationError(`${label}_invalid_characters`);
  }
  return normalized;
}

function escapeContractText(value) {
  // The UI must render the snapshot as text, never with dangerouslySetInnerHTML.
  // Escaping here gives the immutable snapshot the same safe meaning if it is
  // later rendered as HTML by a document exporter.
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidCnpjDigits(digits) {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false;
  const calculate = (base, weights) => {
    const sum = base.split("").reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = calculate(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calculate(digits.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return Number(digits[12]) === first && Number(digits[13]) === second;
}

export class ContractualEnvelopeValidationError extends Error {
  constructor(code) {
    super(code);
    this.name = "ContractualEnvelopeValidationError";
    this.code = code;
  }
}

export function normalizeCounterpartDetails(input) {
  const legalName = asContractText(input?.legalName, "legal_name", 240);
  const taxId = asContractText(input?.taxId, "tax_id", 32).replace(/\D/g, "");
  if (!isValidCnpjDigits(taxId)) throw new ContractualEnvelopeValidationError("tax_id_invalid");
  const registeredAddress = asContractText(input?.registeredAddress, "registered_address", 700);
  const representativeName = asContractText(input?.representativeName, "representative_name", 180);
  const representativeCapacity = asContractText(input?.representativeCapacity, "representative_capacity", 120);
  const signatoryEmail = asContractText(input?.signatoryEmail, "signatory_email", 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signatoryEmail)) throw new ContractualEnvelopeValidationError("signatory_email_invalid");

  return Object.freeze({ legalName, taxId, registeredAddress, representativeName, representativeCapacity, signatoryEmail });
}

export function resolveContractualIssuePolicy(issueContext, flags) {
  const policy = CONTRACTUAL_ISSUE_POLICIES[issueContext];
  if (!policy) throw new ContractualEnvelopeValidationError("issue_context_unsupported");
  if (!flags?.contractualSignaturesEnabled) throw new ContractualEnvelopeValidationError("contractual_signatures_disabled");
  const enabled = policy.feature === "advertising"
    ? flags.contractualAdvertisingSignaturesEnabled
    : flags.contractualPartnershipSignaturesEnabled;
  if (!enabled) throw new ContractualEnvelopeValidationError("contractual_issue_context_disabled");
  return policy;
}

export function assertContractualContextReference(issueContext, referenceId) {
  if (!CONTRACTUAL_ISSUE_POLICIES[issueContext]) {
    throw new ContractualEnvelopeValidationError("issue_context_unsupported");
  }
  if (typeof referenceId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(referenceId)) {
    throw new ContractualEnvelopeValidationError("issue_context_reference_invalid");
  }
  return referenceId.toLowerCase();
}

export function renderContractualSnapshot(template, details) {
  if (typeof template !== "string" || !template.trim()) throw new ContractualEnvelopeValidationError("template_required");
  const normalized = normalizeCounterpartDetails(details);
  const tokens = [...template.matchAll(TOKEN_PATTERN)].map((match) => match[1]);
  const unknown = tokens.find((token) => !Object.hasOwn(CONTRACT_FIELD_TOKENS, token));
  if (unknown) throw new ContractualEnvelopeValidationError("template_unknown_placeholder");

  const values = Object.fromEntries(
    Object.entries(CONTRACT_FIELD_TOKENS).map(([token, field]) => [token, escapeContractText(normalized[field])])
  );
  const contentSnapshot = template.replace(TOKEN_PATTERN, (_match, token) => values[token]);
  if (TOKEN_PATTERN.test(contentSnapshot)) throw new ContractualEnvelopeValidationError("template_unresolved_placeholder");

  return Object.freeze({
    contentSnapshot,
    details: normalized,
    usedTokens: Object.freeze([...new Set(tokens)]),
    requiredFields: REQUIRED_CONTRACT_FIELDS
  });
}
