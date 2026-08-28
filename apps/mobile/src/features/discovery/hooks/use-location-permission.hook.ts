import * as Location from "expo-location";
import { useCallback, useState } from "react";
import { Linking } from "react-native";

import { useAppStore } from "@/store";

export type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

export type UseCurrentLocationResult = {
  ok: boolean;
  /** True when the OS will not show the system prompt again — open Settings. */
  needsSettings?: boolean;
  lat?: number;
  lng?: number;
  label?: string;
  city?: string;
  state?: string;
};

export type UseCurrentLocationOptions = {
  /** When false, returns coordinates without updating discovery store. Default true. */
  applyToStore?: boolean;
};

const NEAR_ME_CLEARED = {
  nearMe: false,
  lat: undefined,
  lng: undefined,
  locationLabel: undefined,
} as const;

export function useLocationPermission() {
  const setDiscovery = useAppStore((s) => s.setDiscovery);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const openAppSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  const getPermission = useCallback(
    () => Location.getForegroundPermissionsAsync(),
    [],
  );

  const deny = useCallback(
    (message: string, needsSettings = false): UseCurrentLocationResult => {
      setStatus("denied");
      setErrorMessage(message);
      setDiscovery({ ...NEAR_ME_CLEARED });
      return { ok: false, needsSettings };
    },
    [setDiscovery],
  );

  const useCurrentLocation =
    useCallback(async (
      options: UseCurrentLocationOptions = {},
    ): Promise<UseCurrentLocationResult> => {
      const applyToStore = options.applyToStore ?? true;
      setStatus("requesting");
      setErrorMessage(null);

      try {
        const existing = await Location.getForegroundPermissionsAsync();
        let permission = existing.status;

        if (permission !== Location.PermissionStatus.GRANTED) {
          if (
            permission === Location.PermissionStatus.DENIED &&
            existing.canAskAgain === false
          ) {
            return deny(
              "Location access is turned off. Enable it in Settings to see restaurants near you.",
              true,
            );
          }

          const requested = await Location.requestForegroundPermissionsAsync();
          permission = requested.status;

          if (permission !== Location.PermissionStatus.GRANTED) {
            const needsSettings = requested.canAskAgain === false;
            return deny(
              needsSettings
                ? "Location access is turned off. Enable it in Settings to see restaurants near you."
                : "Location access was denied. Showing restaurants in your selected city instead.",
              needsSettings,
            );
          }
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const { latitude, longitude } = position.coords;

        let label = "Near you";
        let city: string | undefined;
        let state: string | undefined;
        try {
          const places = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          if (places[0]?.city) {
            label = places[0].city;
            city = places[0].city;
          }
          if (places[0]?.region) state = places[0].region;
        } catch {
          // Keep generic label if reverse geocode fails.
        }

        if (applyToStore) {
          setDiscovery({
            nearMe: true,
            lat: latitude,
            lng: longitude,
            locationLabel: label,
            city: label,
          });
        }
        setStatus("granted");
        return {
          ok: true,
          lat: latitude,
          lng: longitude,
          label,
          city,
          state,
        };
      } catch {
        setStatus("unavailable");
        setErrorMessage(
          "Could not read your location. Showing restaurants in your selected city instead.",
        );
        if (applyToStore) {
          setDiscovery({ ...NEAR_ME_CLEARED });
        }
        return { ok: false };
      }
    }, [deny, setDiscovery]);

  const clearNearMe = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setDiscovery({ ...NEAR_ME_CLEARED });
  }, [setDiscovery]);

  return {
    status,
    errorMessage,
    useCurrentLocation,
    getPermission,
    clearNearMe,
    clearError,
    openAppSettings,
  };
}
