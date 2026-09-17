import { isMongoObjectId } from "./bookingUrl.js";

export const RESTAURANT_SLUG_MIN_LENGTH = 2;
export const RESTAURANT_SLUG_MAX_LENGTH = 80;

export const RESERVED_RESTAURANT_SLUGS = new Set([
  "new",
  "admin",
  "widget",
  "api",
  "login",
  "register",
  "me",
  "search",
]);

const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeRestaurantSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, RESTAURANT_SLUG_MAX_LENGTH);
}

export function isReservedRestaurantSlug(slug: string): boolean {
  return RESERVED_RESTAURANT_SLUGS.has(slug) || isMongoObjectId(slug);
}

export function isValidRestaurantSlug(slug: string): boolean {
  return (
    slug.length >= RESTAURANT_SLUG_MIN_LENGTH &&
    slug.length <= RESTAURANT_SLUG_MAX_LENGTH &&
    SLUG_SHAPE.test(slug) &&
    !isReservedRestaurantSlug(slug)
  );
}
