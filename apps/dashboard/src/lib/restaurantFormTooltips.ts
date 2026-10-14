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
  slug: 'Public booking URL path (/restaurants/{slug}). Old URLs keep working after a change.',
  cuisine: 'One or more cuisine types used for search filters and browsing (first is primary).',
  description: 'Short summary for guests. Optional; max 2000 characters.',
  line1: 'Street address line (building number and street name).',
  city: 'City where the restaurant is located.',
  state: 'Two-letter US state code, e.g. NY or CA.',
  zip: 'Postal ZIP code, 5–10 characters (ZIP+4 allowed).',
  priceRange: 'Approximate price level from $ (inexpensive) to $$$$ (fine dining).',
  lat: 'Latitude in decimal degrees (−90 to 90). Used for map search. Example: 40.7128.',
  lng: 'Longitude in decimal degrees (−180 to 180). Used for map search. Example: −74.006.',
  depositRequired:
    'Restaurant-wide default. When on, guests must leave a card (card guarantee) or pay upfront (prepaid) to hold the reservation. Individual tables can set their own amount on the floor plan.',
  depositAmountCents:
    'Default amount per guest, in USD (e.g. 25.00 = $25.00). Tables with their own deposit use that amount instead.',
  depositPolicy:
    'Card guarantee (recommended, OpenTable/Resy style): the card is saved and nothing is charged; the amount is charged only for a no-show or a late cancellation inside the cancel window below. Prepaid: charged at booking, applied to the bill, refunded if the guest cancels outside that window.',
  cancellationPeriodHours:
    'Hours before the reservation when free cancellation ends. Late cancels and no-shows may forfeit a prepaid deposit or trigger the card-guarantee fee. Leave empty to use the platform default (usually 24). Tables, experiences, and private rooms can override this.',
  noShowMarkingMode:
    'How no-shows are marked after the seating window. Manual only (recommended): hosts/managers mark no-show and any card-guarantee fee charges automatically. Auto: the system marks no-show at slot end without charging a fee. Leave empty to inherit the platform default. Floor areas and tables can override.',
  applyPlatformHolidays:
    'When on, major platform holidays appear for this venue so you can approve closing or set special hours on Closures & hours. When off, platform holidays are ignored for this restaurant.',
  requireHolidayApproval:
    'On (default): each major holiday stays bookable until you approve closing on Closures & hours. Off: major holidays auto-close without approval.',
  holidayOptOutKeys:
    'Major holidays this venue should never close for — they stay open and skip the holiday approval queue (e.g. stay open on Independence Day).',
  holidayOptInKeys:
    'Optional holidays that are off by default but should appear for this venue (e.g. Christmas Eve, New Year’s Eve) so you can approve closing or set special hours.',
  loyaltyEnabled:
    'Run a loyalty program for this restaurant. Guests earn points per completed visit and can redeem against deposits.',
  loyaltyPointsPerVisit: 'Points awarded when a guest completes a visit at your restaurant.',
  loyaltyMinRedeemPoints:
    'Fewest points a guest can redeem in one visit. Guests with fewer points cannot apply loyalty toward a deposit.',
  phone: 'Restaurant contact phone number. US format, e.g. (212) 555-1234. Optional.',
  website: 'Full restaurant website URL including https://. Optional.',
  useSmartAssign: 'Automatically picks the best available table when a reservation is confirmed.',
  minPartySize:
    'Smallest party guests can book online. Leave empty to use the platform default (1). Access rules can still raise the minimum for specific times.',
  maxPartySize:
    'Largest party guests can book online. Leave empty to use the platform default (20). Guests above this see a Large party option to contact you.',
  manualApprovalEnabled:
    'When on, matching online bookings stay pending until you Confirm them in the dashboard. Off by default.',
  manualApprovalPartySize:
    'Optional party-size rule. Leave empty to require approval for every online booking while the switch is on. Example: ≥ 8 means only parties of 8 or more need approval.',
  posEnabled: 'Enable POS sync so walk-ins and covers can update from your POS system.',
  spendAlertDollars: 'Alert managers when a party’s spend reaches this amount. Set 0 to disable.',
  primaryColor: 'Hex color for the booking widget primary button (e.g. #0b3d2e).',
  buttonText: 'Label shown on the booking widget CTA button.',
  showReviews: 'Show average rating and review count on the booking widget.',
} as const;

/** Reject $0 when "deposit required" is on (form value may be dollars or cents). */
export const depositAmountWhenRequiredRule = ({
  getFieldValue,
}: {
  getFieldValue: (name: string) => unknown;
}) => ({
  validator(_: unknown, value: unknown) {
    if (getFieldValue('depositRequired') && !(Number(value) > 0)) {
      return Promise.reject(new Error('Enter a deposit amount greater than $0'));
    }
    return Promise.resolve();
  },
});
