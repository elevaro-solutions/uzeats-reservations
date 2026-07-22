import { PRICE_RANGES } from '@reservations/shared';
import { priceRangeLabel } from '@reservations/ui';

const priceRangeNames: Record<(typeof PRICE_RANGES)[number], string> = {
  1: 'Inexpensive',
  2: 'Moderate',
  3: 'Upscale',
  4: 'Fine dining',
};

export const priceRangeOptions = PRICE_RANGES.map((value) => ({
  value,
  label: `${priceRangeLabel(value)} — ${priceRangeNames[value]}`,
}));

/** Field-level info tooltips for restaurant create/edit forms. */
export const restaurantFieldTooltips = {
  name: 'Public name shown on search results and the booking widget (max 120 characters).',
  cuisine: 'Primary cuisine type used for search filters and browsing.',
  description: 'Short summary for guests. Optional; max 2000 characters.',
  line1: 'Street address line (building number and street name).',
  city: 'City where the restaurant is located.',
  state: 'Two-letter US state code, e.g. NY or CA.',
  zip: 'Postal ZIP code, 5–10 characters (ZIP+4 allowed).',
  priceRange: 'Approximate price level from $ (inexpensive) to $$$$ (fine dining).',
  lat: 'Latitude in decimal degrees (−90 to 90). Used for map search. Example: 40.7128.',
  lng: 'Longitude in decimal degrees (−180 to 180). Used for map search. Example: −74.006.',
  depositRequired: 'When on, guests must pay a per-guest deposit to hold the reservation.',
  depositAmountCents: 'Deposit charged per guest, in cents (e.g. 2500 = $25.00).',
  loyaltyEnabled:
    'Run a loyalty program for this restaurant. Guests earn points per completed visit and can redeem against deposits.',
  loyaltyPointsPerVisit: 'Points awarded when a guest completes a visit at your restaurant.',
  loyaltyMinRedeemPoints: 'Minimum restaurant points a guest must redeem at once.',
  phone: 'Restaurant contact phone number. US format, e.g. (212) 555-1234. Optional.',
  website: 'Full restaurant website URL including https://. Optional.',
  useSmartAssign: 'Automatically picks the best available table when a reservation is confirmed.',
  posEnabled: 'Enable POS sync so walk-ins and covers can update from your POS system.',
  spendAlertDollars: 'Alert staff when a party’s spend reaches this amount. Set 0 to disable.',
  primaryColor: 'Hex color for the booking widget primary button (e.g. #0b3d2e).',
  buttonText: 'Label shown on the booking widget CTA button.',
  showReviews: 'Show average rating and review count on the booking widget.',
} as const;
