/** Magnific stock search terms for discovery taxonomy thumbnails. */

export const DISCOVERY_CATEGORY_IMAGE_TERMS: Record<string, string> = {
  romantic: 'romantic candlelit dinner restaurant',
  italian: 'italian pasta restaurant table',
  brunch: 'brunch eggs benedict restaurant',
  mexican: 'mexican tacos restaurant',
  pizza: 'wood fired pizza restaurant',
  seafood: 'seafood platter restaurant',
  american: 'american burger restaurant',
  fun: 'lively restaurant bar friends',
  japanese: 'japanese ramen restaurant',
  birthdays: 'birthday cake restaurant celebration',
  sushi: 'sushi platter restaurant',
  steak: 'steakhouse grilled steak',
  casual: 'casual dining restaurant',
  chinese: 'chinese dim sum restaurant',
  mediterranean: 'mediterranean mezze restaurant',
  indian: 'indian curry restaurant',
  groups: 'group dining restaurant table',
  'fine-dining': 'fine dining restaurant plate',
  'kid-friendly': 'family dining restaurant kids',
  tapas: 'spanish tapas restaurant',
};

export const DISCOVERY_CUISINE_IMAGE_TERMS: Record<string, string> = {
  american: 'american comfort food restaurant',
  italian: 'italian pasta restaurant',
  mexican: 'mexican food restaurant',
  mediterranean: 'mediterranean food restaurant',
  indian: 'indian curry restaurant',
  'middle-eastern': 'middle eastern food restaurant',
  turkish: 'turkish kebab restaurant',
  'uzbek-central-asian': 'plov pilaf central asian food',
  japanese: 'japanese food restaurant',
  chinese: 'chinese food restaurant',
  thai: 'thai food restaurant',
  korean: 'korean bbq restaurant',
  vietnamese: 'vietnamese pho restaurant',
  french: 'french cuisine restaurant',
  greek: 'greek food restaurant',
  caribbean: 'caribbean food restaurant',
  'latin-american': 'latin american food restaurant',
  african: 'african cuisine restaurant',
  seafood: 'fresh seafood restaurant',
  fusion: 'fusion cuisine restaurant',
  steakhouse: 'steakhouse restaurant',
  pizza: 'pizza restaurant',
  sushi: 'sushi restaurant',
  tapas: 'tapas restaurant',
  brunch: 'brunch restaurant',
  vegetarian: 'vegetarian restaurant food',
  uzbek: 'uzbek plov restaurant',
};

export const DISCOVERY_OCCASION_IMAGE_TERMS: Record<string, string> = {
  'date-night': 'romantic date night dinner',
  birthday: 'birthday dinner restaurant',
  anniversary: 'anniversary dinner wine',
  'business-meal': 'business lunch restaurant',
  'family-dinner': 'family dinner restaurant',
  'group-dining': 'group dinner restaurant',
  'special-occasion': 'celebration dinner restaurant',
  'private-event': 'private dining room restaurant',
};

export type DiscoveryImageTaxonomyKind = 'category' | 'cuisine' | 'occasion' | 'landmark';

/** Keyword used by `/api/discovery-image` for the default stock thumbnail. */
export function discoveryStockImageTerm(
  kind: DiscoveryImageTaxonomyKind,
  slug: string,
  label: string,
): string {
  const lower = label.toLowerCase();
  switch (kind) {
    case 'category':
      return DISCOVERY_CATEGORY_IMAGE_TERMS[slug] ?? `${lower} restaurant`;
    case 'cuisine':
      return DISCOVERY_CUISINE_IMAGE_TERMS[slug] ?? `${lower} restaurant`;
    case 'occasion':
      return DISCOVERY_OCCASION_IMAGE_TERMS[slug] ?? `restaurant for ${lower}`;
    case 'landmark':
      return `${lower} landmark`;
    default:
      return `${lower} restaurant`;
  }
}
