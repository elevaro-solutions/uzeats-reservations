import { createMMKV } from "react-native-mmkv";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
import { create } from "zustand";

export const mmkv = createMMKV({ id: "tablevera-merchant" });

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
  activeRestaurantId: string | null;
  setActiveRestaurantId: (id: string | null) => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeRestaurantId: null,
      setActiveRestaurantId: (id) => set({ activeRestaurantId: id }),
    }),
    {
      name: "tablevera-merchant-app",
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        activeRestaurantId: state.activeRestaurantId,
      }),
    },
  ),
);
