import { createMMKV } from "react-native-mmkv";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
import { create } from "zustand";

import { tomorrowIsoDate } from "@/lib/helpers/date-time.helpers";
import { PLATFORM_TIMEZONE } from "@reservations/shared";

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

function platformTomorrowIsoDate(): string {
  return tomorrowIsoDate(PLATFORM_TIMEZONE);
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
  dietaryTags?: string[];
  amenities?: string[];
};

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = {
  query: "",
  city: "New York",
  date: platformTomorrowIsoDate(),
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
            date: platformTomorrowIsoDate(),
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
