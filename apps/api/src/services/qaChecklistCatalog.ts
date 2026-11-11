export const QA_CHECKLIST_RELEASE = '0.104.0';

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
    id: 'rel-map-clusters',
    gate: 'required',
    group: 'Diner web map',
    label: 'Map groups overlapping restaurants into a numbered bubble; tapping it zooms in or lists venues',
    steps: [
      'On diner web, open search and switch to the Map view. Zoom out until several restaurants overlap. Confirm they collapse into one bubble showing a count.',
      'Click the bubble. Confirm the map glides to it and zooms in smoothly, one level at a time, until the restaurants separate into individual markers.',
      'Find (or seed) two restaurants at the same address. Click their bubble and confirm a “restaurants here” list opens instead of zooming forever; pick one and confirm its card opens.',
      'At a mid zoom where name labels would overlap, confirm overlapping labels are hidden but the pin itself is still clickable.',
    ],
  },
  {
    id: 'rel-map-marker-chips',
    gate: 'required',
    group: 'Diner web map',
    label: 'Map markers are white chips (dot + name); selected marker is a larger gold dot with a halo',
    steps: [
      'On the Map view, confirm each restaurant shows as one white chip containing its dot and name.',
      'Hover a chip. Confirm its shadow deepens smoothly and the dot pops with a soft ring.',
      'Click a chip. Confirm the selected restaurant shows a larger gold dot with a soft halo and its name label hides while the card is open; closing the card brings the label back.',
    ],
  },
  {
    id: 'rel-map-card-polish',
    gate: 'required',
    group: 'Diner web map',
    label: 'Map restaurant card: tail lands above the dot, fades in, lighter slots, hover photo arrows, focus states',
    steps: [
      'Click a restaurant on the map. Confirm the card fades in and its pointer tail joins the card seamlessly and lands just above the selected dot.',
      'On a restaurant with 2+ photos, confirm the photo arrows appear on hover (desktop) and are always visible on a touch device / mobile emulation.',
      'Confirm the time-slot buttons look lighter than before and every button (close, arrows, slots) shows a hover state and a visible focus ring when tabbing with the keyboard.',
    ],
  },
  {
    id: 'rel-map-card-edges',
    gate: 'required',
    group: 'Diner web map',
    label: 'Map card and “restaurants here” list stay inside the map near its edges',
    steps: [
      'Pan so a marker sits near the top edge of the map and click it. Confirm the card flips below the marker instead of being cut off.',
      'Repeat with markers near the left and right edges. Confirm the card shifts sideways and stays fully inside the map.',
      'Make the browser window short, then select a restaurant low on the map. Confirm the map pans so the card fits above the marker.',
      'Repeat the top-edge check with a same-spot bubble and confirm the “restaurants here” list also stays inside the map.',
    ],
  },
  {
    id: 'rel-map-sync-after-filter',
    gate: 'required',
    group: 'Diner web map',
    label: 'Map labels and positions stay in sync after the result list changes',
    steps: [
      'On the Map view, change filters (e.g. cuisine, price, or search text) a few times so the result list changes.',
      'Confirm each marker label matches the restaurant at that position and no stale labels or bubbles are left behind from the previous results.',
    ],
  },
  {
    id: 'rel-map-short-window',
    gate: 'required',
    group: 'Diner web map',
    label: 'Map page on a short desktop window: map is not clipped; filters scroll inside their panel',
    steps: [
      'On desktop, resize the browser to a short height (around 600–700px) and open the Map view.',
      'Confirm the bottom of the map is visible and the page does not grow taller than the screen.',
      'Scroll inside the filters sidebar and confirm it scrolls within its own panel.',
    ],
  },
  {
    id: 'rel-redeem-empty-inputs',
    gate: 'required',
    group: 'Diner booking',
    label: 'Redeem points inputs start empty (no leading 0)',
    steps: [
      'Sign in as a diner with loyalty points and start a booking on a restaurant that takes a deposit.',
      'Confirm the “Redeem loyalty points” input (and the restaurant points input, if shown) is empty with a “Min …” placeholder, not 0.',
      'Type 1432. Confirm the value reads 1432, not 01432.',
    ],
  },
  {
    id: 'rel-redeem-validation',
    gate: 'required',
    group: 'Diner booking',
    label: 'Redeem points shows the real validation message and blocks booking until valid',
    steps: [
      'On the same booking, enter fewer points than the minimum. Confirm the message says “Minimum redeem is … points”.',
      'Enter more points than your balance. Confirm the message says “Insufficient loyalty points” (not “Minimum 500 points”) and booking cannot proceed.',
      'On a small deposit, enter a large valid amount. Confirm it shows the capped amount actually redeemed, or “Deposit is too small to redeem …” when even the minimum does not fit.',
      'Enter a valid amount. Confirm the success message shows the discount and the confirm step lists the same points redeemed.',
    ],
  },
];
