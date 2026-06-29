import { createHash } from "node:crypto";

export function normalizeAdvertiserName(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function createLegacyKey(normalizedName) {
  const digest = createHash("sha256").update(normalizedName).digest("hex");
  return `legacy:${digest}`;
}

function toTimestamp(value) {
  const timestamp = new Date(value ?? 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function pickDisplayName(campaigns) {
  return [...campaigns]
    .sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt))
    .map((campaign) => String(campaign.advertiser ?? "").trim())
    .find(Boolean);
}

export function buildAdvertiserBackfillPlan(campaigns, accounts) {
  const groups = new Map();
  const conflicts = [];
  const accountsByLegacyKey = new Map();
  const accountsById = new Map(accounts.map((account) => [account.id, account]));

  for (const account of accounts) {
    if (!account.legacyKey) continue;
    if (accountsByLegacyKey.has(account.legacyKey)) {
      conflicts.push({
        code: "duplicate_legacy_key",
        legacyKey: account.legacyKey,
        accountIds: [accountsByLegacyKey.get(account.legacyKey).id, account.id]
      });
      continue;
    }
    accountsByLegacyKey.set(account.legacyKey, account);
  }

  for (const campaign of campaigns) {
    const normalizedName = normalizeAdvertiserName(campaign.advertiser);
    if (!normalizedName) {
      conflicts.push({ code: "empty_advertiser", campaignId: campaign.id });
      continue;
    }
    const group = groups.get(normalizedName) ?? [];
    group.push(campaign);
    groups.set(normalizedName, group);
  }

  const accountPlans = [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "pt-BR"))
    .map(([normalizedName, groupedCampaigns]) => {
      const legacyKey = createLegacyKey(normalizedName);
      const existingAccount = accountsByLegacyKey.get(legacyKey) ?? null;
      const displayName = pickDisplayName(groupedCampaigns);
      const linkableCampaignIds = [];
      const alreadyLinkedCampaignIds = [];

      for (const campaign of groupedCampaigns) {
        if (!campaign.advertiserAccountId) {
          linkableCampaignIds.push(campaign.id);
          continue;
        }

        const linkedAccount = accountsById.get(campaign.advertiserAccountId);
        if (existingAccount && campaign.advertiserAccountId === existingAccount.id) {
          alreadyLinkedCampaignIds.push(campaign.id);
          continue;
        }

        conflicts.push({
          code: linkedAccount ? "campaign_link_mismatch" : "linked_account_not_found",
          campaignId: campaign.id,
          advertiserAccountId: campaign.advertiserAccountId,
          expectedAccountId: existingAccount?.id ?? null,
          normalizedName
        });
      }

      return {
        normalizedName,
        displayName,
        legacyKey,
        accountAction: existingAccount ? "reuse" : "create_draft_unclassified",
        existingAccountId: existingAccount?.id ?? null,
        sourceVariants: [...new Set(groupedCampaigns.map((item) => item.advertiser))],
        campaignCount: groupedCampaigns.length,
        linkableCampaignIds,
        alreadyLinkedCampaignIds
      };
    });

  return {
    mode: "dry-run",
    summary: {
      campaignsRead: campaigns.length,
      accountsRead: accounts.length,
      normalizedGroups: accountPlans.length,
      accountsToCreate: accountPlans.filter((item) => item.accountAction.startsWith("create")).length,
      accountsToReuse: accountPlans.filter((item) => item.accountAction === "reuse").length,
      campaignsToLink: accountPlans.reduce((total, item) => total + item.linkableCampaignIds.length, 0),
      campaignsAlreadyLinked: accountPlans.reduce(
        (total, item) => total + item.alreadyLinkedCampaignIds.length,
        0
      ),
      conflicts: conflicts.length
    },
    accountPlans,
    conflicts
  };
}
