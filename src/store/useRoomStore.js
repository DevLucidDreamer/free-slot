import { create } from "zustand";
import { sheetdb } from "../lib/sheetdb";

export const useRoomStore = create((set, get) => ({
  room: null,
  events: [],
  loading: false,
  error: null,

  async loadRoom(roomId) {
    set({ loading: true, error: null });
    try {
      const rows = await sheetdb.searchSheet("rooms", { roomId });
      set({ room: rows?.[0] ?? null });
    } catch (e) {
      set({ error: e?.message || "Failed to load room" });
    } finally {
      set({ loading: false });
    }
  },

  async loadEvents(roomId) {
    set({ loading: true, error: null });
    try {
      const rows = await sheetdb.searchSheet("events", { roomId });
      set({ events: Array.isArray(rows) ? rows : [] });
    } catch (e) {
      set({ error: e?.message || "Failed to load events" });
    } finally {
      set({ loading: false });
    }
  },

  async refresh(roomId) {
    await Promise.all([get().loadRoom(roomId), get().loadEvents(roomId)]);
  },

  setEventsLocal(events) {
    set({ events });
  },
}));
