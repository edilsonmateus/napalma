import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const VERSION_LABEL = "1.5.0-local";
const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/juridico/pacote_piloto_casas_v1_5");

const DOCUMENTS = [
  { key: "termos-de-uso", category: "terms_of_use", file: "01_termos_de_uso_77gira_piloto_v1_5.txt", audiences: ["visitor", "user", "artist_manager", "venue_manager", "producer"], requiresReacceptance: true },
  { key: "politica-de-privacidade-e-cookies", category: "privacy_cookies", file: "02_politica_de_privacidade_77gira_piloto_v1_5.txt", audiences: ["visitor", "user", "artist_manager", "venue_manager", "producer"], requiresReacceptance: true },
  { key: "termo-reivindicacao-e-gestao-de-perfil", category: "claim_management", file: "03_termo_de_reivindicacao_e_gestao_de_perfil_piloto_v1_5.txt", audiences: ["artist_manager", "venue_manager", "producer"], requiresReacceptance: true },
  { key: "politica-de-conteudo-moderacao-e-denuncias", category: "content_moderation", file: "04_politica_de_conteudo_moderacao_e_denuncias_piloto_v1_5.txt", audiences: ["visitor", "user", "artist_manager", "venue_manager", "producer"], requiresReacceptance: true },
];

function assertLocalEnvironment() {
  const databaseUrl = process.env.DATABASE_URL || "";
  if (process.env.NODE_ENV === "production" || process.env.RENDER || !/(localhost|127\.0\.0\.1|\[::1\])/i.test(databaseUrl)) {
    throw new Error("Este comando é exclusivo para homologação local e exige um banco de dados em localhost.");
  }
}

function sha256(content) {
  return createHash("sha256").update(content.replace(/\r\n/g, "\n").trim(), "utf8").digest("hex");
}

async function loadContent(file) {
  return (await readFile(path.join(packageDirectory, file), "utf8")).replace(/\r\n/g, "\n").trim();
}

async function main() {
  assertLocalEnvironment();
  const admin = await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true, email: true }, orderBy: { createdAt: "asc" } });
  if (!admin) throw new Error("Nenhum administrador local foi encontrado.");

  const results = [];
  for (const specification of DOCUMENTS) {
    const document = await prisma.legalDocument.findUnique({ where: { key: specification.key } });
    if (!document || document.category !== specification.category) {
      throw new Error(`O documento ${specification.key} não está disponível com a categoria esperada. Nenhuma alteração foi aplicada.`);
    }

    const contentText = await loadContent(specification.file);
    const existing = await prisma.legalDocumentVersion.findUnique({ where: { documentId_versionLabel: { documentId: document.id, versionLabel: VERSION_LABEL } } });
    if (existing) {
      if (existing.contentSha256 !== sha256(contentText)) throw new Error(`A versão local ${VERSION_LABEL} de ${specification.key} diverge do pacote atual. Crie uma nova versão; não sobrescreva histórico.`);
      results.push({ document: specification.key, result: "já existente" });
      continue;
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.legalDocumentVersion.updateMany({ where: { documentId: document.id, status: "active" }, data: { status: "replaced", replacedAt: now } });
      await tx.legalDocumentVersion.create({
        data: {
          documentId: document.id,
          versionLabel: VERSION_LABEL,
          status: "active",
          contentText,
          contentSha256: sha256(contentText),
          changeType: "material",
          changeSummary: "Versão local do pacote piloto de casas para validar ciência, reivindicação e assinatura. Sem validade jurídica e sem publicação externa.",
          requiresReacceptance: specification.requiresReacceptance,
          effectiveAt: now,
          reviewedAt: now,
          reviewedByUserId: admin.id,
          approvedAt: now,
          approvedByUserId: admin.id,
          publishedAt: now,
          publishedByUserId: admin.id,
          createdByUserId: admin.id,
          audiences: { create: specification.audiences.map((audience) => ({ audience })) },
        },
      });
    });
    results.push({ document: specification.key, result: "ativado localmente" });
  }

  console.table(results);
  console.log(`Pacote piloto local pronto. Administrador de referência: ${admin.email}`);
}

main()
  .catch((error) => { console.error(error.message || error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
