import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DOCUMENT_KEY = "termo-reivindicacao-e-gestao-de-perfil";
const HOMOLOGATION_VERSION = "0.0.1";
const LOCAL_ONLY_MARKER = "HOMOLOGAÇÃO LOCAL — SEM VALIDADE JURÍDICA";
const AUDIENCES = ["artist_manager", "venue_manager", "producer"];

function sha256(value) {
  return createHash("sha256").update(value.replace(/\r\n/g, "\n").trim(), "utf8").digest("hex");
}

function assertLocalEnvironment() {
  const databaseUrl = process.env.DATABASE_URL || "";
  const pointsToLocalDatabase = /(?:localhost|127\.0\.0\.1|\[::1\])/i.test(databaseUrl);

  if (
    process.env.NODE_ENV === "production"
    || process.env.RENDER
    || process.env.RENDER_SERVICE_ID
    || !pointsToLocalDatabase
  ) {
    throw new Error("Este comando é exclusivo para homologação local e não pode ser executado em produção.");
  }
}

function homologationContent() {
  return `${LOCAL_ONLY_MARKER}

Esta cópia é destinada exclusivamente ao teste técnico do fluxo de aprovação de elegibilidade e assinatura eletrônica reforçada no ambiente local do 77Gira.

Não deve ser publicada, enviada a terceiros, utilizada em produção ou interpretada como termo contratual vigente.

1. OBJETO DO TESTE
Este registro simula o termo aplicável a uma solicitação de reivindicação de perfil artístico ou acesso à gestão de uma casa.

2. DECLARAÇÃO DA PESSOA SOLICITANTE
A pessoa solicitante declara, somente para fins de homologação, que as informações prestadas sobre seu vínculo com o perfil ou a casa podem ser analisadas pela equipe do 77Gira.

3. VÍNCULO E GESTÃO SOLICITADA
O acesso só poderá ser liberado após avaliação administrativa e conclusão da assinatura reforçada vinculada a esta versão.

4. EVIDÊNCIAS E VERIFICAÇÃO
O 77Gira pode solicitar informações adicionais, documentação e esclarecimentos antes de decidir. A aprovação desta etapa não substitui a futura minuta revisada juridicamente.

5. TRILHA DE AUDITORIA
O teste registra protocolo, versão, hash de integridade, data, conta autenticada e confirmação realizada para verificar o comportamento técnico do aplicativo.

6. ENCERRAMENTO
Ao finalizar este teste, esta versão deverá permanecer restrita ao ambiente local. A versão contratual real somente poderá ser criada após revisão jurídica e publicação controlada.`;
}

async function main() {
  assertLocalEnvironment();

  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" }
  });
  if (!admin) throw new Error("Nenhum administrador local foi encontrado. Crie ou inicialize a conta admin antes da homologação.");

  const existingDocument = await prisma.legalDocument.findUnique({ where: { key: DOCUMENT_KEY } });
  const document = existingDocument || await prisma.legalDocument.create({
    data: {
      key: DOCUMENT_KEY,
      title: "Termo de Reivindicação e Gestão de Perfil",
      category: "claim_management",
      summary: "Estrutura criada para homologação local do fluxo de reivindicação e assinatura.",
      isPublic: false
    }
  });

  const existingVersion = await prisma.legalDocumentVersion.findUnique({
    where: { documentId_versionLabel: { documentId: document.id, versionLabel: HOMOLOGATION_VERSION } },
    include: { audiences: true }
  });

  if (existingVersion) {
    const safeExisting = existingVersion.changeSummary?.includes("homologação local")
      || existingVersion.contentText.startsWith(LOCAL_ONLY_MARKER);
    if (!safeExisting) {
      throw new Error(`A versão ${HOMOLOGATION_VERSION} já existe, mas não é uma versão de homologação local. Nenhum dado foi alterado.`);
    }
    console.log(`Homologação local já disponível: ${document.title} v${existingVersion.versionLabel} (${existingVersion.status}).`);
    return;
  }

  const contentText = homologationContent();
  const version = await prisma.legalDocumentVersion.create({
    data: {
      documentId: document.id,
      versionLabel: HOMOLOGATION_VERSION,
      status: "approved",
      contentText,
      contentSha256: sha256(contentText),
      changeType: "material",
      changeSummary: "Versão de homologação local para testar aprovação de elegibilidade e assinatura reforçada; sem validade jurídica e sem publicação.",
      requiresReacceptance: false,
      reviewedAt: new Date(),
      reviewedByUserId: admin.id,
      approvedAt: new Date(),
      approvedByUserId: admin.id,
      createdByUserId: admin.id,
      audiences: { create: AUDIENCES.map((audience) => ({ audience })) }
    }
  });

  console.log(`Homologação local criada: ${document.title} v${version.versionLabel} (${version.status}).`);
  console.log(`Público: ${AUDIENCES.join(", ")}. Documento não é público e não tem validade jurídica.`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
