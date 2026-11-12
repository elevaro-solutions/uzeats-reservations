export const QA_CHECKLIST_RELEASE = '0.106.1';

export type QaChecklistGate = 'required' | 'recommended';

export type QaChecklistCatalogItem = {
  id: string;
  gate: QaChecklistGate;
  group: string;
  label: string;
  /** How to verify this item. Shown beside the checkbox and in the steps panel. */
  steps: string[];
};

/** Release-delta items stored by id. Labels ship with the API so the saved row stays small. */
export const QA_CHECKLIST_CATALOG: QaChecklistCatalogItem[] = [
  {
    id: 'rel-redeem-both-points',
    gate: 'required',
    group: 'Diner booking',
    label: 'Restaurant points are accepted when Tablevera points already cover part of the deposit',
    steps: [
      'Sign in as a diner with both Tablevera points and restaurant points at a restaurant that takes a deposit. Start a booking.',
      'Enter Tablevera points that cover most of the deposit, then a valid restaurant-points amount. Confirm the restaurant points are accepted (no minimum / invalid error) and Tablevera points are reduced so both fit, with a note saying so.',
      'Enter restaurant points that use the whole deposit. Confirm Tablevera points show “Not applied — restaurant points use the rest of this deposit…” and are left off.',
      'Complete the booking. Confirm the confirm step and the reservation list the same points that were actually applied.',
    ],
  },
  {
    id: 'rel-map-card-close-mobile',
    gate: 'required',
    group: 'Diner web map',
    label: 'On a phone, the map restaurant card’s close button stays on the map',
    steps: [
      'On a phone (or mobile emulation), open diner search in Map view and tap a restaurant marker.',
      'Confirm the card’s close (×) button is visible on the map and not hidden under the results list.',
      'Tap it and confirm the card closes. Repeat near the bottom of the map.',
    ],
  },
  {
    id: 'rel-map-marker-logos',
    gate: 'required',
    group: 'Diner web map',
    label: 'Map markers show the restaurant logo, or initials when there is no logo',
    steps: [
      'Open diner search in Map view. Confirm each marker chip shows the restaurant’s logo where the green dot used to be.',
      'Find a restaurant without a logo. Confirm its chip shows its initials instead.',
      'Hover and select a marker. Confirm the hover effect and the selected state still work, and the card opens for the right restaurant.',
    ],
  },
];
