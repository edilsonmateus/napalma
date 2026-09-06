import { describe, expect, it } from "vitest";
import {
  ContractualEnvelopeValidationError,
  assertContractualContextReference,
  normalizeCounterpartDetails,
  renderContractualSnapshot,
  resolveContractualIssuePolicy
} from "../src/services/contractualEnvelope.service.js";

const validDetails = {
  legalName: "Casa do Samba Ltda.",
  taxId: "11.222.333/0001-81",
  registeredAddress: "Rua do Samba, 77\nRio de Janeiro/RJ",
  representativeName: "Ana da Silva",
  representativeCapacity: "Sócia administradora",
  signatoryEmail: "ANA@EXEMPLO.COM"
};

describe("contractual envelope foundation", () => {
  it("normalizes only the required counterpart data and validates a CNPJ", () => {
    expect(normalizeCounterpartDetails(validDetails)).toEqual({
      ...validDetails,
      taxId: "11222333000181",
      signatoryEmail: "ana@exemplo.com"
    });
  });

  it("rejects a missing field or an invalid CNPJ before an envelope can be emitted", () => {
    expect(() => normalizeCounterpartDetails({ ...validDetails, legalName: "" })).toThrow(ContractualEnvelopeValidationError);
    expect(() => normalizeCounterpartDetails({ ...validDetails, taxId: "11.111.111/1111-11" })).toThrow("tax_id_invalid");
  });

  it("fills only allowed placeholders and keeps counterpart text inert", () => {
    const result = renderContractualSnapshot(
      "Contratada: {{RAZAO_SOCIAL_CONTRAPARTE}}; CNPJ {{CNPJ_CONTRAPARTE}}; e-mail {{EMAIL_SIGNATARIO}}.",
      { ...validDetails, legalName: "Casa <script>alert(1)</script> & Cia" }
    );
    expect(result.contentSnapshot).toContain("Casa &lt;script&gt;alert(1)&lt;/script&gt; &amp; Cia");
    expect(result.contentSnapshot).not.toContain("{{RAZAO_SOCIAL_CONTRAPARTE}}");
  });

  it("blocks a template whose variables were not expressly allowed", () => {
    expect(() => renderContractualSnapshot("Valor: {{VALOR_CONTRATO}}", validDetails)).toThrow("template_unknown_placeholder");
  });

  it("keeps contractual contexts off unless both the master and context flag are enabled", () => {
    expect(() => resolveContractualIssuePolicy("advertising_contract", { contractualSignaturesEnabled: false })).toThrow("contractual_signatures_disabled");
    expect(resolveContractualIssuePolicy("advertising_contract", {
      contractualSignaturesEnabled: true,
      contractualAdvertisingSignaturesEnabled: true,
      contractualPartnershipSignaturesEnabled: false
    })).toMatchObject({ documentKey: "contrato-base-publicidade", completionMode: "proposal_acceptance" });
  });

  it("requires an internal context reference rather than a client-selected document version", () => {
    expect(assertContractualContextReference("advertising_contract", "5f3470bd-bf8c-4b0e-9d2d-8f9b5bbab252"))
      .toBe("5f3470bd-bf8c-4b0e-9d2d-8f9b5bbab252");
    expect(() => assertContractualContextReference("advertising_contract", "contrato-base-publicidade"))
      .toThrow("issue_context_reference_invalid");
  });
});
