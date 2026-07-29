import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { sendInstitutionalEmail } from "../services/transactionalEmail.service.js";

const recipientTypes = ["venue_producer", "partner_brand", "user"];

const templates = [
  { id: "venue-welcome", audience: "venue_producer", title: "Boas-vindas para casa ou produtor", subject: "Bem-vinda ao 77Gira", contentHtml: "<h2>Olá, {{nome}}</h2><p>É um prazer ter você no 77Gira. Estamos à disposição para apoiar a visibilidade da sua programação e manter as informações públicas sempre claras.</p><p>Conte com a nossa equipe.</p>" },
  { id: "venue-invite", audience: "venue_producer", title: "Convite para cadastrar uma casa", subject: "Vamos cadastrar sua casa no 77Gira?", contentHtml: "<h2>Olá, {{nome}}</h2><p>O 77Gira reúne a agenda de samba da cidade. Gostaríamos de conversar sobre o cadastro da sua casa e a organização da programação.</p><p>Se fizer sentido, responda este e-mail para seguirmos.</p>" },
  { id: "schedule-update", audience: "venue_producer", title: "Solicitação de atualização de programação", subject: "Atualização de programação no 77Gira", contentHtml: "<h2>Olá, {{nome}}</h2><p>Para manter a agenda útil para o público, precisamos confirmar ou atualizar as próximas datas, atrações e horários vinculados ao seu cadastro.</p><p>Você pode responder a este e-mail com as informações mais recentes.</p>" },
  { id: "brand-intro", audience: "partner_brand", title: "Apresentação institucional para marca", subject: "77Gira: uma conversa sobre parceria", contentHtml: "<h2>Olá, {{nome}}</h2><p>O 77Gira conecta público, casas, artistas e produtores em torno da agenda do samba. Gostaríamos de apresentar possibilidades de parceria institucional alinhadas à cultura e à cidade.</p><p>Podemos agendar uma conversa?</p>" },
  { id: "partner-reply", audience: "partner_brand", title: "Resposta a proposta de parceria", subject: "Retorno sobre sua proposta para o 77Gira", contentHtml: "<h2>Olá, {{nome}}</h2><p>Obrigado pelo interesse em construir uma parceria com o 77Gira. Recebemos sua proposta e nossa equipe fará a análise de aderência, contexto e possibilidades de ativação.</p><p>Retornaremos assim que houver uma atualização.</p>" },
  { id: "user-notice", audience: "user", title: "Comunicado geral para usuário", subject: "Um comunicado do 77Gira", contentHtml: "<h2>Olá, {{nome}}</h2><p>Escrevemos para compartilhar uma atualização importante sobre o 77Gira.</p><p>Obrigado por fazer parte da comunidade.</p>" }
];

const optionalText = (max) => z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().max(max).optional());
const messageInputSchema = z.object({
  recipientName: optionalText(160),
  recipientEmail: z.preprocess((value) => (typeof value === "string" ? value.trim().toLowerCase() : value), z.string().email().max(160).optional()),
  recipientType: z.enum(recipientTypes).optional(),
  recipientReferenceId: optionalText(120),
  subject: optionalText(220),
  contentHtml: optionalText(50_000),
  templateKey: optionalText(80),
  includePartnerRail: z.boolean().optional()
});

function sanitizeHtml(value = "") {
  const allowedTags = new Set(["p", "br", "strong", "b", "em", "i", "h2", "h3", "ul", "ol", "li", "a"]);
  return String(value)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]*>/g, (rawTag) => {
      const match = rawTag.match(/^<\s*(\/?)\s*([a-z0-9]+)([^>]*)>$/i);
      if (!match) return "";
      const [, closing, rawName, rawAttrs] = match;
      const name = rawName.toLowerCase();
      if (!allowedTags.has(name)) return "";
      if (closing) return `</${name}>`;
      if (name !== "a") return `<${name}>`;
      const href = rawAttrs.match(/href\s*=\s*(["'])(.*?)\1/i)?.[2]?.trim();
      if (!href || !/^(https?:\/\/|mailto:)/i.test(href)) return "<a>";
      const safeHref = href.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">`;
    })
    .trim();
}

function textFromHtml(value = "") {
  return String(value).replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>|<\/h[23]>|<\/li>/gi, "\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function serialize(item) {
  return {
    id: item.id,
    recipientName: item.recipientName,
    recipientEmail: item.recipientEmail,
    recipientType: item.recipientType,
    recipientReferenceId: item.recipientReferenceId,
    subject: item.subject,
    contentHtml: item.contentHtml,
    contentText: item.contentText,
    templateKey: item.templateKey,
    includePartnerRail: item.includePartnerRail,
    status: item.status,
    failureReason: item.failureReason,
    sentAt: item.sentAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    author: item.author ? { id: item.author.id, name: [item.author.firstName, item.author.lastName].filter(Boolean).join(" ") || "Equipe 77Gira" } : null
  };
}

function validateReadyToSend(message) {
  const errors = [];
  if (!message.recipientEmail) errors.push("Informe um destinatário individual.");
  if (!message.recipientType) errors.push("Escolha o tipo de destinatário.");
  if (!message.subject?.trim()) errors.push("Informe o assunto.");
  if (!textFromHtml(message.contentHtml).trim()) errors.push("Escreva a mensagem antes de enviar.");
  if (errors.length) {
    const error = new Error(errors.join(" "));
    error.status = 400;
    throw error;
  }
}

async function eligiblePartnerRail() {
  const now = new Date();
  return prisma.strategicPartner.findMany({
    where: {
      status: "active",
      publicVisible: true,
      canAppearAsSupporter: true,
      logoUrl: { not: null },
      OR: [
        { isPermanent: true },
        { AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }
      ]
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { name: true, logoUrl: true },
    take: 12
  });
}

export async function listOperationsCommunicationTemplates(_req, res) {
  return res.json({ items: templates });
}

export async function listOperationsCommunicationMessages(req, res, next) {
  try {
    const status = req.query?.status;
    const where = status && ["draft", "sent", "failed"].includes(status) ? { status } : {};
    const items = await prisma.operationCommunicationMessage.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
      include: { author: { select: { id: true, firstName: true, lastName: true } } }
    });
    return res.json({ items: items.map(serialize) });
  } catch (error) { return next(error); }
}

export async function listOperationsCommunicationRecipients(req, res, next) {
  try {
    const type = String(req.query?.type || "");
    const query = String(req.query?.q || "").trim();
    if (!recipientTypes.includes(type) || query.length < 2) return res.json({ items: [] });
    const search = { contains: query, mode: "insensitive" };
    const items = [];
    if (type === "partner_brand") {
      const partners = await prisma.strategicPartner.findMany({ where: { OR: [{ name: search }, { contactEmail: search }] }, select: { id: true, name: true, contactName: true, contactEmail: true }, take: 20 });
      partners.filter((item) => item.contactEmail).forEach((item) => items.push({ id: item.id, name: item.contactName || item.name, email: item.contactEmail, detail: item.name }));
    } else if (type === "venue_producer") {
      const [venues, users] = await Promise.all([
        prisma.venue.findMany({ where: { OR: [{ name: search }, { manager: { is: { email: search } } }, { manager: { is: { firstName: search } } }] }, select: { id: true, name: true, manager: { select: { id: true, firstName: true, lastName: true, email: true } } }, take: 20 }),
        prisma.user.findMany({ where: { role: { in: ["producer", "venue_manager"] }, OR: [{ email: search }, { firstName: search }, { lastName: search }, { username: search }] }, select: { id: true, firstName: true, lastName: true, email: true }, take: 20 })
      ]);
      venues.filter((venue) => venue.manager).forEach((venue) => items.push({ id: venue.manager.id, name: [venue.manager.firstName, venue.manager.lastName].filter(Boolean).join(" ") || venue.name, email: venue.manager.email, detail: venue.name }));
      users.forEach((user) => items.push({ id: user.id, name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email, email: user.email, detail: "Casa ou produtor" }));
    } else {
      const users = await prisma.user.findMany({ where: { OR: [{ email: search }, { firstName: search }, { lastName: search }, { username: search }] }, select: { id: true, firstName: true, lastName: true, email: true }, take: 20 });
      users.forEach((user) => items.push({ id: user.id, name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email, email: user.email, detail: "Usuário" }));
    }
    const unique = [...new Map(items.map((item) => [item.email, item])).values()].slice(0, 20);
    return res.json({ items: unique });
  } catch (error) { return next(error); }
}

export async function createOperationsCommunicationMessage(req, res, next) {
  try {
    const input = messageInputSchema.parse(req.body || {});
    const contentHtml = sanitizeHtml(input.contentHtml || "");
    const item = await prisma.operationCommunicationMessage.create({
      data: { ...input, contentHtml, contentText: textFromHtml(contentHtml), authorUserId: req.user.id, status: "draft" },
      include: { author: { select: { id: true, firstName: true, lastName: true } } }
    });
    await prisma.auditLog.create({ data: { actorUserId: req.user.id, action: "operations.communication_drafted", subjectType: "operation_communication", subjectId: item.id, metadata: { recipientType: item.recipientType, hasRecipient: Boolean(item.recipientEmail) } } });
    return res.status(201).json({ item: serialize(item), message: "Rascunho salvo." });
  } catch (error) { return next(error); }
}

export async function updateOperationsCommunicationMessage(req, res, next) {
  try {
    const input = messageInputSchema.parse(req.body || {});
    const existing = await prisma.operationCommunicationMessage.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } });
    if (!existing) return res.status(404).json({ error: "communication_not_found", message: "Mensagem não encontrada." });
    if (existing.status === "sent") return res.status(409).json({ error: "communication_already_sent", message: "E-mails enviados não podem ser alterados. Crie uma nova mensagem para enviar uma atualização." });
    const contentHtml = input.contentHtml === undefined ? undefined : sanitizeHtml(input.contentHtml || "");
    const item = await prisma.operationCommunicationMessage.update({
      where: { id: req.params.id },
      data: { ...input, ...(contentHtml === undefined ? {} : { contentHtml, contentText: textFromHtml(contentHtml) }), status: "draft", failureReason: null },
      include: { author: { select: { id: true, firstName: true, lastName: true } } }
    });
    await prisma.auditLog.create({ data: { actorUserId: req.user.id, action: "operations.communication_updated", subjectType: "operation_communication", subjectId: item.id, metadata: { recipientType: item.recipientType } } });
    return res.json({ item: serialize(item), message: "Rascunho atualizado." });
  } catch (error) { return next(error); }
}

export async function sendOperationsCommunicationMessage(req, res, next) {
  try {
    const message = await prisma.operationCommunicationMessage.findUnique({ where: { id: req.params.id }, include: { author: { select: { id: true, firstName: true, lastName: true } } } });
    if (!message) return res.status(404).json({ error: "communication_not_found", message: "Mensagem não encontrada." });
    if (message.status === "sent") return res.status(409).json({ error: "communication_already_sent", message: "Este e-mail já foi enviado e permanece no histórico." });
    validateReadyToSend(message);
    try {
      const partners = message.includePartnerRail ? await eligiblePartnerRail() : [];
      await sendInstitutionalEmail({
        email: message.recipientEmail,
        recipientName: message.recipientName,
        subject: message.subject,
        contentHtml: message.contentHtml,
        contentText: message.contentText,
        partnerLogos: partners.map((item) => ({ name: item.name, logoUrl: item.logoUrl }))
      });
    } catch (deliveryError) {
      const failureReason = deliveryError?.message?.slice(0, 500) || "Não foi possível concluir o envio.";
      const failed = await prisma.operationCommunicationMessage.update({ where: { id: message.id }, data: { status: "failed", failureReason } });
      await prisma.auditLog.create({ data: { actorUserId: req.user.id, action: "operations.communication_failed", subjectType: "operation_communication", subjectId: message.id, metadata: { recipientType: message.recipientType } } });
      return res.status(502).json({ error: "communication_delivery_failed", message: "Não foi possível enviar agora. O rascunho foi preservado para nova tentativa.", item: serialize(failed) });
    }
    const sent = await prisma.operationCommunicationMessage.update({
      where: { id: message.id },
      data: { status: "sent", sentAt: new Date(), failureReason: null },
      include: { author: { select: { id: true, firstName: true, lastName: true } } }
    });
    await prisma.auditLog.create({ data: { actorUserId: req.user.id, action: "operations.communication_sent", subjectType: "operation_communication", subjectId: message.id, metadata: { recipientType: message.recipientType, includePartnerRail: message.includePartnerRail } } });
    return res.json({ item: serialize(sent), message: "E-mail enviado e registrado no histórico." });
  } catch (error) { return next(error); }
}
