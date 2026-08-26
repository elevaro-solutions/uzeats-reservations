import * as Location from "expo-location";
import { useCallback, useState } from "react";

import { useAppStore } from "@/store";

export type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

export function useLocationPermission() {
  const setDiscovery = useAppStore((s) => s.setDiscovery);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const useCurrentLocation = useCallback(async () => {
    setStatus("requesting");
    setErrorMessage(null);

    try {
      const { status: permission } =
        await Location.requestForegroundPermissionsAsync();

      if (permission !== "granted") {
        setStatus("denied");
        setErrorMessage(
          "Location access was denied. Showing restaurants in your selected city instead.",
        );
        setDiscovery({
          nearMe: false,
          lat: undefined,
          lng: undefined,
          locationLabel: undefined,
        });
        return false;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      let label = "Near you";
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        const place = places[0];
        if (place?.city) {
          label = place.city;
          if (place.region) label = `${place.city}`;
        }
      } catch {
        // Keep generic label if reverse geocode fails.
      }

      setDiscovery({
        nearMe: true,
        lat: latitude,
        lng: longitude,
        locationLabel: label,
        city: label,
      });
      setStatus("granted");
      return true;
    } catch {
      setStatus("unavailable");
      setErrorMessage(
        "Could not read your location. Showing restaurants in your selected city instead.",
      );
      setDiscovery({
        nearMe: false,
        lat: undefined,
        lng: undefined,
        locationLabel: undefined,
      });
      return false;
    }
  }, [setDiscovery]);

  const clearNearMe = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setDiscovery({
      nearMe: false,
      lat: undefined,
      lng: undefined,
      locationLabel: undefined,
    });
  }, [setDiscovery]);

  return {
    status,
    errorMessage,
    useCurrentLocation,
    clearNearMe,
  };
}
