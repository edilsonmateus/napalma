import { create } from "zustand";

export const useUserStore = create((set) => ({
  radarIds: ["evt-1"],
  historyIds: ["evt-1"],
  toggleRadar: (eventId) =>
    set((state) => ({
      radarIds: state.radarIds.includes(eventId)
        ? state.radarIds.filter((id) => id !== eventId)
        : [...state.radarIds, eventId]
    }))
}));
