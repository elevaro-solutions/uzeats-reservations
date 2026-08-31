import type { RestaurantDetail, ProfileSectionTab } from "../types";

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

export function dinerInitials(diner?: {
  firstName?: string | null;
  lastName?: string | null;
} | null): string {
  const first = diner?.firstName?.trim()?.[0] ?? "";
  const last = diner?.lastName?.trim()?.[0] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "G";
}
