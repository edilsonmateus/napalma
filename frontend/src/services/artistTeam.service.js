import { api } from "./api";

export async function getArtistTeam(artistId) { const { data } = await api.get(`/me/artists/${artistId}/team`); return data; }
export async function inviteArtistTeamMember(artistId, payload) { const { data } = await api.post(`/me/artists/${artistId}/team`, payload); return data.item; }
export async function updateArtistTeamMember(id, payload) { const { data } = await api.patch(`/me/artist-team/${id}`, payload); return data.item; }
export async function revokeArtistTeamMember(id) { await api.delete(`/me/artist-team/${id}`); }
export async function getMyArtistInvitations() { const { data } = await api.get("/me/artist-invitations"); return data.items || []; }
export async function decideMyArtistInvitation(id, accept) { const { data } = await api.patch(`/me/artist-invitations/${id}`, { accept }); return data.item; }
