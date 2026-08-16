import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const VERSION_LABEL = "0.0.1-local";
const LOCAL_MARKER = "HOMOLOGACAO LOCAL - SEM VALIDADE JURIDICA";

const ALL_PLATFORM_AUDIENCES = [
  "visitor",
  "user",
  "artist_manager",
  "venue_manager",
  "producer",
  "advertiser",
  "strategic_partner",
];

const DOCUMENTS = [
  { key: "termos-de-uso", title: "Termos de Uso", category: "terms_of_use", audiences: ALL_PLATFORM_AUDIENCES },
  {
    key: "politica-de-privacidade-e-cookies",
    title: "Pol\u00edtica de Privacidade e Cookies",
    category: "privacy_cookies",
    audiences: ALL_PLATFORM_AUDIENCES,
  },
  {
    key: "politica-de-conteudo-moderacao-e-denuncias",
    title: "Pol\u00edtica de Conte\u00fado, Modera\u00e7\u00e3o e Den\u00fancias",
    category: "content_moderation",
    audiences: ALL_PLATFORM_AUDIENCES,
  },
  {
    key: "termos-de-publicidade",
    title: "Termos de Publicidade",
    category: "advertising_terms",
    audiences: ["advertiser", "venue_manager", "producer", "artist_manager"],
  },
  {
    key: "regulamento-de-patacos-e-milipatacos",
    title: "Regulamento de Patacos e Milipatacos",
    category: "patacos_policy",
    audiences: ["advertiser", "venue_manager", "producer", "artist_manager"],
  },
  {
    key: "termos-de-parceria",
    title: "Termos de Parceria",
    category: "partnership_terms",
    audiences: ["strategic_partner"],
  },
  {
    key: "termos-internos-de-operacao",
    title: "Termos Internos de Opera\u00e7\u00e3o",
    category: "internal_operations",
    audiences: ["internal_operator"],
  },
];

function assertLocalEnvironment() {
  const databaseUrl = process.env.DATABASE_URL || "";
  const pointsToLocalDatabase = /(?:localhost|127\.0\.0\.1|\[::1\])/i.test(databaseUrl);

  if (
    process.env.NODE_ENV === "production"
    || process.env.RENDER
    || process.env.RENDER_SERVICE_ID
    || !pointsToLocalDatabase
  ) {
    throw new Error("Este seed e exclusivo para homologacao local e exige DATABASE_URL apontando para localhost.");
  }
}

function sha256(content) {
  return createHash("sha256").update(content.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}

function buildContent(document) {
  return [
    LOCAL_MARKER,
    "",
    `Documento de teste: ${document.title}`,
    "",
    "Esta versao existe somente para validar, em localhost, a apresentacao de documentos, o aceite auditavel e a assinatura eletronica reforcada.",
    "Ela nao possui vigencia, nao e publica, nao deve ser enviada a terceiros e nao gera obrigacao juridica.",
    "",
    `Personas de homologacao: ${document.audiences.join(", ")}.`,
    "",
    "O registro pode permanecer no banco local como evidencia de QA ou ser descartado no proximo reset local.",
  ].join("\n");
}

async function findLocalAdmin() {
  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });

  if (!admin) {
    throw new Error("Nenhum administrador local foi encontrado. Inicie o backend antes de executar este seed.");
  }

  return admin;
}

async function ensureDocumentVersion(specification, admin) {
  let document = await prisma.legalDocument.findUnique({ where: { key: specification.key } });

  if (!document) {
    document = await prisma.legalDocument.create({
      data: {
        key: specification.key,
        title: specification.title,
        category: specification.category,
        summary: "Versao de homologacao local. Sem validade juridica e sem publicacao.",
        isPublic: false,
      },
    });
  } else if (document.isPublic) {
    // This script has an explicit local-database guard. Local QA documents must
    // never be exposed by the public-document route, even when the base record
    // was created earlier by the catalogue bootstrap.
    document = await prisma.legalDocument.update({
      where: { id: document.id },
      data: { isPublic: false },
    });
  }

  if (document.category !== specification.category) {
    throw new Error(`O documento ${specification.key} existe com categoria divergente. Nenhuma alteracao foi feita.`);
  }

  const existing = await prisma.legalDocumentVersion.findUnique({
    where: {
      documentId_versionLabel: {
        documentId: document.id,
        versionLabel: VERSION_LABEL,
      },
    },
  });

  if (existing) {
    if (!existing.contentText.includes(LOCAL_MARKER)) {
      throw new Error(`A versao ${VERSION_LABEL} de ${specification.key} nao pertence a homologacao local.`);
    }
    return { documento: specification.key, resultado: "ja existente" };
  }

  const contentText = buildContent(specification);
  await prisma.legalDocumentVersion.create({
    data: {
      documentId: document.id,
      versionLabel: VERSION_LABEL,
      status: "approved",
      contentText,
      contentSha256: sha256(contentText),
      changeType: "material",
      changeSummary: "Versao local para testes de aceite e assinatura. Sem validade juridica.",
      requiresReacceptance: false,
      reviewedAt: new Date(),
      reviewedByUserId: admin.id,
      approvedAt: new Date(),
      approvedByUserId: admin.id,
      createdByUserId: admin.id,
      audiences: { create: specification.audiences.map((audience) => ({ audience })) },
    },
  });

  return { documento: specification.key, resultado: "criado" };
}

async function main() {
  assertLocalEnvironment();
  const admin = await findLocalAdmin();
  const results = [];

  for (const document of DOCUMENTS) {
    results.push(await ensureDocumentVersion(document, admin));
  }

  console.table(results);
  console.log("Catalogo de homologacao local preparado.");
  console.log("Nenhum documento foi publicado ou ativado para bloqueios normais de conta.");
  console.log(`Administrador de referencia: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
