import { createMMKV } from "react-native-mmkv";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
import { create } from "zustand";

export const mmkv = createMMKV({ id: "tablevera" });

const mmkvStorage: StateStorage = {
  getItem: (name) => {
    const value = mmkv.getString(name);
    return value ?? null;
  },
  setItem: (name, value) => {
    mmkv.set(name, value);
  },
  removeItem: (name) => {
    mmkv.remove(name);
  },
};

function tomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type DiscoveryFilters = {
  query: string;
  city: string;
  state?: string;
  date: string;
  time?: string;
  partySize: number;
  cuisine?: string;
  priceRange?: number;
  minRating?: number;
  radiusKm: number;
  nearMe: boolean;
  lat?: number;
  lng?: number;
  locationLabel?: string;
  wheelchairAccessible?: boolean;
  diningStyles?: string[];
  occasions?: string[];
  meals?: string[];
  amenities?: string[];
};

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = {
  query: "",
  city: "New York",
  date: tomorrowIsoDate(),
  partySize: 2,
  radiusKm: 25,
  nearMe: false,
};

type AppStore = {
  lastSearchCity: string;
  setLastSearchCity: (city: string) => void;
  discovery: DiscoveryFilters;
  setDiscovery: (partial: Partial<DiscoveryFilters>) => void;
  resetDiscovery: () => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      lastSearchCity: "New York",
      setLastSearchCity: (city) =>
        set((state) => ({
          lastSearchCity: city,
          discovery: { ...state.discovery, city, nearMe: false, lat: undefined, lng: undefined },
        })),
      discovery: { ...DEFAULT_DISCOVERY_FILTERS },
      setDiscovery: (partial) =>
        set((state) => {
          const next = { ...state.discovery, ...partial };
          const cityUpdate =
            partial.city != null ? { lastSearchCity: partial.city } : {};
          return { discovery: next, ...cityUpdate };
        }),
      resetDiscovery: () =>
        set({
          discovery: {
            ...DEFAULT_DISCOVERY_FILTERS,
            date: tomorrowIsoDate(),
          },
          lastSearchCity: "New York",
        }),
    }),
    {
      name: "tablevera-app",
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        lastSearchCity: state.lastSearchCity,
        discovery: state.discovery,
      }),
    },
  ),
);
