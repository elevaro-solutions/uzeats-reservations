/** Verified Unsplash food & dining photos (all return HTTP 200). */
export const DEFAULT_RESTAURANT_PHOTO =
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop&auto=format&q=80';

export const RESTAURANT_PHOTO_FALLBACKS = [
  DEFAULT_RESTAURANT_PHOTO,
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&h=600&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&h=600&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&h=600&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop&auto=format&q=80',
] as const;

export function pickRestaurantPhoto(
  photos?: (string | null | undefined)[] | null,
): string {
  const valid = (photos ?? []).filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
  return valid[0] ?? DEFAULT_RESTAURANT_PHOTO;
}

export function restaurantPhotoCandidates(
  photos?: (string | null | undefined)[] | null,
): string[] {
  const valid = (photos ?? []).filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
  return valid.length > 0 ? valid : [...RESTAURANT_PHOTO_FALLBACKS];
}
