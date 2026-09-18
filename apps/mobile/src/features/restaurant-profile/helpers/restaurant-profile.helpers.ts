import type { RestaurantDetail, ProfileSectionTab } from "../types";

/** Space units the content sheet overlaps the hero (`marginTop: -space(n)`). */
export const HERO_SHEET_OVERLAP = 2.5;

export function hasMenuContent(restaurant: RestaurantDetail): boolean {
  const sections = restaurant.menu?.sections ?? [];
  const hasItems = sections.some((s) => (s.items?.length ?? 0) > 0);
  return hasItems || Boolean(restaurant.menuUrl?.trim());
}

export function hasPhotosContent(restaurant: RestaurantDetail): boolean {
  return (restaurant.photos?.length ?? 0) > 0;
}

export function buildVisibleTabs(
  restaurant: RestaurantDetail,
): ProfileSectionTab[] {
  const tabs: ProfileSectionTab[] = ["details"];
  if (hasMenuContent(restaurant) || restaurant.website) {
    tabs.push("menu");
  }
  tabs.push("reviews");
  if (hasPhotosContent(restaurant)) {
    tabs.push("photos");
  }
  return tabs;
}

export function formatMenuPrice(priceCents?: number | null): string | null {
  if (priceCents == null || Number.isNaN(priceCents)) return null;
  return `$${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}`;
}

export function formatReviewDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function dinerDisplayName(diner?: {
  firstName?: string | null;
  lastName?: string | null;
} | null): string {
  const first = diner?.firstName?.trim() ?? "";
  const last = diner?.lastName?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || "Guest";
}

export function restaurantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function pickRestaurantLogo(
  logoUrl?: string | null,
  photos?: (string | null | undefined)[] | null,
): string | null {
  const logo = logoUrl?.trim();
  if (logo) return logo;
  const photo = (photos ?? []).find(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
  return photo ?? null;
}
