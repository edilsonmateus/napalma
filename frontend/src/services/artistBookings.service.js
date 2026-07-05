import { api } from "./api";

export async function createArtistBooking(payload) { const { data } = await api.post("/artist-bookings", payload); return data; }
export async function getArtistBookings(artistId, status) { const { data } = await api.get(`/me/artists/${artistId}/bookings`, { params: status && status !== "all" ? { status } : {} }); return data.items || []; }
export async function updateArtistBookingStatus(id, status) { const { data } = await api.patch(`/me/artist-bookings/${id}/status`, { status }); return data.item; }
