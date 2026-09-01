import { useState } from "react";
import { Alert } from "react-native";

import { useAppStore, type DiscoveryFilters } from "@/store";

import { formatLocationLabel } from "../helpers/format-location-label.helpers";
import type { AddressSelection } from "../helpers/place-autocomplete.helpers";
import { useLocationPermission } from "./use-location-permission.hook";

export type UseDiscoveryLocationOptions = {
  target?: "store" | "draft";
  draft?: DiscoveryFilters;
  onDraftPatch?: (partial: Partial<DiscoveryFilters>) => void;
};

export function useDiscoveryLocation({
  target = "store",
  draft,
  onDraftPatch,
}: UseDiscoveryLocationOptions = {}) {
  const discovery = useAppStore((s) => s.discovery);
  const setDiscovery = useAppStore((s) => s.setDiscovery);
  const locationSource = target === "draft" && draft ? draft : discovery;

  const [locationOpen, setLocationOpen] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);

  const {
    useCurrentLocation,
    getPermission,
    status: locationStatus,
    errorMessage,
    clearError,
    openAppSettings,
  } = useLocationPermission();

  const locationLabel = formatLocationLabel(locationSource);

  async function handleUseLocation() {
    clearError();
    const result = await useCurrentLocation({
      applyToStore: target === "store",
    });
    if (result.ok && result.lat != null && result.lng != null) {
      if (target === "draft") {
        onDraftPatch?.({
          nearMe: true,
          lat: result.lat,
          lng: result.lng,
          locationLabel: result.label ?? "Near you",
          city: result.city ?? locationSource.city,
          state: result.state ?? locationSource.state,
        });
      }
      setLocationOpen(false);
      return;
    }
    // Permission deny with applyToStore:false must not touch the live store;
    // still clear near-me on the draft so Cancel doesn't leave a half-applied state.
    if (target === "draft") {
      onDraftPatch?.({
        nearMe: false,
        lat: undefined,
        lng: undefined,
        locationLabel: undefined,
      });
    }
    if (result.needsSettings) {
      Alert.alert(
        "Enable location",
        "Turn on location access for Tablevera in Settings to see restaurants near you.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void openAppSettings() },
        ],
      );
    }
  }

  async function handleNearMePress() {
    clearError();
    const existing = await getPermission();
    if (existing.status === "granted") {
      await handleUseLocation();
      return;
    }
    if (existing.status === "denied" && existing.canAskAgain === false) {
      await handleUseLocation();
      return;
    }
    setPermissionOpen(true);
  }

  function handleSelectCity(city: string, state?: string | null) {
    const next = {
      city,
      state: state ?? undefined,
      nearMe: false,
      lat: undefined,
      lng: undefined,
      locationLabel: undefined,
    };
    if (target === "draft") {
      onDraftPatch?.(next);
    } else {
      setDiscovery(next);
    }
    setLocationOpen(false);
  }

  function handleSelectPlace(place: AddressSelection) {
    const next = {
      nearMe: true,
      lat: place.lat,
      lng: place.lng,
      locationLabel: place.label,
      city: place.city ?? place.label,
      state: place.state,
    };
    if (target === "draft") {
      onDraftPatch?.(next);
    } else {
      setDiscovery(next);
    }
    setLocationOpen(false);
  }

  return {
    locationLabel,
    locationOpen,
    permissionOpen,
    locationStatus,
    errorMessage,
    openLocationSheet: () => setLocationOpen(true),
    locationSheetProps: {
      visible: locationOpen,
      currentLabel: locationLabel,
      highlightCitySelection: !locationSource.nearMe,
      nearMeLoading: locationStatus === "requesting",
      onClose: () => setLocationOpen(false),
      onSelectCity: handleSelectCity,
      onSelectPlace: handleSelectPlace,
      onUseCurrentLocation: () => {
        void handleNearMePress();
      },
    },
    permissionModalProps: {
      visible: permissionOpen,
      loading: locationStatus === "requesting",
      onClose: () => setPermissionOpen(false),
      onAllow: () => {
        setPermissionOpen(false);
        void handleUseLocation();
      },
    },
  };
}
