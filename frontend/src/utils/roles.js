export function isProducerRole(role) {
  return role === "producer" || role === "produtor";
}

export function isVenueRole(role) {
  return role === "venue_manager" || role === "casa";
}

export function isAdminRole(role) {
  return role === "admin";
}

export function getRoleHome(role) {
  // Explorar é o ponto de partida de toda conta. As áreas profissionais,
  // inclusive as administrativas, continuam acessíveis pela navegação.
  return "/explore";
}
