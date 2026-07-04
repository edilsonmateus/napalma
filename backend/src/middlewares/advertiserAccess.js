import { prisma } from "../lib/prisma.js";

const WRITE_ROLES = ["owner", "admin", "campaign_manager"];

export async function requireAdvertiserCampaignWrite(req, res, next) {
  try {
    const campaignId = req.body?.campaignId;
    if (!campaignId) return res.status(400).json({ error: "campaign_required", message: "Informe a campanha." });
    const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId }, select: { advertiserAccountId: true } });
    if (!campaign?.advertiserAccountId) return res.status(404).json({ error: "campaign_not_found" });
    const access = await prisma.advertiserMembership.findFirst({ where: { userId: req.user.id, accountId: campaign.advertiserAccountId, status: "active", role: { in: WRITE_ROLES } } });
    if (!access) return res.status(403).json({ error: "advertiser_access_denied", message: "Sem permissao para enviar criativos desta campanha." });
    req.advertiserMembership = access;
    return next();
  } catch (error) { return next(error); }
}
