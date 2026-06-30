import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LocationData = {
  lat: number;
  lon: number;
  village?: string;
  district?: string;
  state?: string;
  country?: string;
  label?: string;
  source: "gps" | "search" | "map";
};

type LocationState = {
  current: LocationData | null;
  favorites: LocationData[];
  recents: LocationData[];
  setCurrent: (loc: LocationData | null) => void;
  addFavorite: (loc: LocationData) => void;
  removeFavorite: (key: string) => void;
};

const keyOf = (l: LocationData) => `${l.lat.toFixed(3)},${l.lon.toFixed(3)}`;

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      current: null,
      favorites: [],
      recents: [],
      setCurrent: (loc) => {
        if (!loc) {
          set({ current: null });
          return;
        }
        const recents = [loc, ...get().recents.filter((r) => keyOf(r) !== keyOf(loc))].slice(0, 5);
        set({ current: loc, recents });
      },
      addFavorite: (loc) =>
        set((s) => ({
          favorites: s.favorites.some((f) => keyOf(f) === keyOf(loc))
            ? s.favorites
            : [...s.favorites, loc],
        })),
      removeFavorite: (key) =>
        set((s) => ({ favorites: s.favorites.filter((f) => keyOf(f) !== key) })),
    }),
    { name: "krishiai-location" },
  ),
);
