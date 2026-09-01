export type { DiscoveryFilters } from "@/store";
export { DEFAULT_DISCOVERY_FILTERS } from "@/store";

export {
  formatPriceRange,
  formatPriceRangeLabel,
  formatPriceRangeChip,
  PRICE_RANGE_OPTIONS,
} from "./helpers/format-price-range.helpers";
export { formatShortHours } from "./helpers/format-short-hours.helpers";
export {
  formatRestaurantLocation,
  formatCardAddress,
  formatFullAddress,
} from "./helpers/format-location.helpers";
export {
  buildSearchInput,
  buildHomeFeedInput,
  type SearchRestaurantsInput,
} from "./helpers/build-search-input.helpers";
export {
  fetchPlacePredictions,
  fetchPlaceDetails,
  hasGoogleMapsApiKey,
  type PlacePrediction,
  type AddressSelection,
} from "./helpers/place-autocomplete.helpers";
export { formatLocationLabel } from "./helpers/format-location-label.helpers";
export { useInfiniteRestaurantSearch } from "./hooks/use-infinite-restaurant-search.hook";
export { useDiscoveryLocation } from "./hooks/use-discovery-location.hook";
export { useLocationPermission } from "./hooks/use-location-permission.hook";
export type { UseCurrentLocationResult, UseCurrentLocationOptions } from "./hooks/use-location-permission.hook";
export { usePlacePredictions } from "./hooks/use-place-predictions.hook";
export { useToggleFavorite } from "./hooks/use-toggle-favorite.hook";
export type {
  RestaurantListItem,
  RestaurantAddress,
  RestaurantShift,
  SearchRestaurantsResult,
  DiscoveryIndexEntry,
  DiscoveryIndexData,
  ScopedDiscoveryIndexData,
} from "./types";
export { RestaurantCard } from "./components/restaurant-card.component";
export { LocationSheet } from "./components/location-sheet.component";
export { LocationPermissionModal } from "./components/location-permission-modal.component";
export { SectionHeader } from "./components/section-header.component";
export type { SectionHeaderProps } from "./components/section-header.component";
export { CuisineChipSection } from "./components/cuisine-chip-section.component";
export type { CuisineChipSectionProps } from "./components/cuisine-chip-section.component";
export { DiningStylesGrid } from "./components/dining-styles-grid.component";
export type { DiningStylesGridProps } from "./components/dining-styles-grid.component";
export {
  DINING_STYLE_TILES,
  type DiningStyleTile,
  type DiningStyleFilter,
  type DiningStyleIconLayout,
} from "./data/dining-styles";
export {
  WineIcon,
  CroissantIcon,
  RoseIcon,
  MusicIcon,
  PianoIcon,
  ArrowRightIcon,
} from "./icons/dining-style-icons";
export { splitCuisineRows } from "./helpers/split-cuisine-rows.helpers";
