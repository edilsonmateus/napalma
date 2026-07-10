import { z } from "zod";
import {
  allocateWalletCreditsToCampaign,
  createMockPaymentOrder,
  getActiveAdvertiserMembership,
  getBillingOperationsSnapshot,
  getWalletSnapshot,
  paymentRuntime,
  processMockPaymentOrder
} from "../services/adPayments.service.js";
import { prisma } from "../lib/prisma.js";

const uuid = z.string().uuid();

function sendResult(res, result, successStatus = 200) {
  if (result.error) return res.status(result.status || 400).json({ error: result.error, message: result.message });
  return res.status(successStatus).json(result);
}

export async function getMyAdvertiserWallet(req, res, next) {
  try {
    const accountId = uuid.parse(req.params.accountId);
    const membership = await getActiveAdvertiserMembership(req.user.id, accountId);
    if (!membership) return res.status(403).json({ error: "advertiser_access_denied", message: "Sem acesso a esta carteira." });
    return res.json({ item: await getWalletSnapshot(accountId), membership: { role: membership.role } });
  } catch (error) { return next(error); }
}

export async function createMyPaymentOrder(req, res, next) {
  try {
    const accountId = uuid.parse(req.params.accountId);
    const payload = z.object({
      packageCode: z.enum(["test_controlled", "local_boost", "presence_campaign"]),
      campaignId: uuid.optional().nullable(),
      returnPath: z.string().max(500).optional()
    }).parse(req.body);
    return sendResult(res, await createMockPaymentOrder({ accountId, ...payload, userId: req.user.id }), 201);
  } catch (error) { return next(error); }
}

export async function allocateMyWalletCredits(req, res, next) {
  try {
    const accountId = uuid.parse(req.params.accountId);
    const payload = z.object({ campaignId: uuid, amount: z.number().int().positive().max(1000000) }).parse(req.body);
    return sendResult(res, await allocateWalletCreditsToCampaign({ accountId, ...payload, userId: req.user.id }));
  } catch (error) { return next(error); }
}

export async function getMyPaymentOrder(req, res, next) {
  try {
    const id = uuid.parse(req.params.id);
    const item = await prisma.adPaymentOrder.findUnique({ where: { id }, include: { account: { select: { id: true, name: true } }, campaign: { select: { id: true, name: true } } } });
    if (!item) return res.status(404).json({ error: "payment_order_not_found", message: "Ordem de pagamento nao encontrada." });
    const membership = await getActiveAdvertiserMembership(req.user.id, item.accountId);
    if (!membership) return res.status(403).json({ error: "advertiser_access_denied", message: "Sem acesso a esta ordem." });
    return res.json({ item, runtime: paymentRuntime() });
  } catch (error) { return next(error); }
}

export async function processMyMockPaymentOrder(req, res, next) {
  try {
    const orderId = uuid.parse(req.params.id);
    const { outcome } = z.object({ outcome: z.enum(["approved", "pending", "rejected", "cancelled"]) }).parse(req.body);
    return sendResult(res, await processMockPaymentOrder({ orderId, outcome, userId: req.user.id }));
  } catch (error) { return next(error); }
}

export async function getAdsBillingOperations(_req, res, next) {
  try {
    return res.json({ item: await getBillingOperationsSnapshot() });
  } catch (error) { return next(error); }
}

export async function processAdminMockPaymentOrder(req, res, next) {
  try {
    const orderId = uuid.parse(req.params.id);
    const { outcome } = z.object({ outcome: z.enum(["approved", "pending", "rejected", "cancelled"]) }).parse(req.body);
    return sendResult(res, await processMockPaymentOrder({ orderId, outcome, userId: req.user.id, skipAccess: true }));
  } catch (error) { return next(error); }
}
