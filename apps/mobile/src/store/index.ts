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

type AppStore = {
  lastSearchCity: string;
  setLastSearchCity: (city: string) => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      lastSearchCity: "New York",
      setLastSearchCity: (city) => set({ lastSearchCity: city }),
    }),
    {
      name: "tablevera-app",
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
