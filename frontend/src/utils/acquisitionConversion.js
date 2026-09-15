export function missingAcquisitionVenueFields(lead) {
  return [["address", "endereço"], ["neighborhood", "bairro"], ["region", "região"], ["city", "cidade"]]
    .filter(([key]) => !String(lead?.[key] || "").trim())
    .map(([, label]) => label);
}

export function pendingAcquisitionConversions(leads) {
  return leads.filter((lead) => lead.status === "closed" && !lead.convertedVenueId);
}
