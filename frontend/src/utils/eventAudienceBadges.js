function normalizeTag(tag) {
  return String(tag || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

export function getAudienceBadges(event) {
  const tags = Array.isArray(event?.tags) ? event.tags.map(normalizeTag) : [];
  const badges = [];

  if (tags.includes("samba_familiar")) {
    badges.push("Samba Familiar");
  }
  if (tags.includes("kids_friendly")) {
    badges.push("Kids Friendly");
  }

  return badges;
}
