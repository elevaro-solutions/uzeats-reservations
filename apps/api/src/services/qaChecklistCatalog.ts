export const QA_CHECKLIST_RELEASE = '0.102.0';

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
    id: 'rel-agreement-modal-checkbox',
    gate: 'required',
    group: 'Agreements',
    label: 'Agreement review modal: scroll to end unlocks the “I have read and agree” checkbox',
    steps: [
      'On diner web Create account, open the Terms of Use review modal. Confirm the “I have read and agree to the … (version N)” checkbox is disabled and I accept is blocked.',
      'Scroll the agreement to the end. Confirm the checkbox unlocks; I accept still needs the box ticked. Tick it and accept.',
      'Repeat on Partner Hub /register Confirm and on /agreements/sign (owner). Download the PDF from each in Firefox and confirm it saves and opens (QA-020).',
    ],
  },
  {
    id: 'rel-reservations-location-filter',
    gate: 'required',
    group: 'Partner Hub',
    label: 'Reservations (All restaurants) All locations filter narrows list and export (QA-025)',
    steps: [
      'Sign in as an owner with 2+ restaurants and pick All restaurants. Open Reservations.',
      'Use the All locations filter to choose one restaurant. Confirm the list shows only that restaurant’s bookings.',
      'Export. Confirm the file only contains that restaurant. Switch back to All locations and confirm every restaurant returns.',
    ],
  },
  {
    id: 'rel-engagement-email-audience',
    gate: 'required',
    group: 'Admin',
    label: 'Admin Engagement email: Everyone who booked vs Past guests only, and {{firstName}} in subject (QA-018)',
    steps: [
      'As Super Admin, open Admin → Engagement → email, and target one restaurant.',
      'Switch between Everyone who booked and Past guests only. Confirm the recipient count changes (upcoming-only guests drop out of Past guests only).',
      'Put {{firstName}} in the subject and send to a test diner. Confirm the subject shows the diner’s first name.',
    ],
  },
  {
    id: 'rel-seat-same-day-only',
    gate: 'required',
    group: 'Floor',
    label: 'Guests can only be seated on the day of their reservation; Live floor shows seated parties (QA-029)',
    steps: [
      'In Partner Hub, try to seat a reservation booked for tomorrow (Reservations or Live floor). Confirm it is refused with a clear message.',
      'If the Telegram bot is connected, try seating the same booking from the bot and confirm it is refused too.',
      'Seat a reservation for today. Confirm the Live floor shows the party on its table.',
    ],
  },
  {
    id: 'rel-manual-invoice-reuse',
    gate: 'required',
    group: 'Billing',
    label: 'Admin manual invoice works after an invoice for the same period was canceled (QA-028)',
    steps: [
      'As Super Admin, cancel (or replace) an invoice for a test restaurant’s current period.',
      'Create a manual invoice for the same restaurant and period. Confirm it saves without “That value is already in use”.',
      'Confirm the new invoice has its own number and shows on the restaurant’s Invoices tab.',
    ],
  },
  {
    id: 'rel-past-due-clears',
    gate: 'required',
    group: 'Billing',
    label: 'Paying every invoice clears Past Due and the old balance (QA-026); Pay invoices button text visible (QA-027)',
    steps: [
      'Use a test restaurant marked Past Due with 1+ open invoices. In Partner Hub Billing, use Pay all and pay with a test card.',
      'While confirming, confirm the button reads “Updating invoices…” and is legible.',
      'After payment, confirm Billing no longer shows Past Due or the old balance, and Admin → Restaurants shows the same.',
    ],
  },
  {
    id: 'rel-diner-message-restaurant',
    gate: 'required',
    group: 'Diner web',
    label: 'Message the restaurant succeeds even when the restaurant email can’t be delivered (QA-024)',
    steps: [
      'On a diner restaurant page whose restaurant email is missing or undeliverable (e.g. a seed .local address), send Message the restaurant.',
      'Confirm the diner sees success, not Internal server error.',
      'In Partner Hub for that restaurant, confirm the message appears in the inbox.',
    ],
  },
  {
    id: 'rel-review-counts-search',
    gate: 'required',
    group: 'Diner web',
    label: 'Search / browse cards show published review counts, not seeded totals (QA-017, QA-023)',
    steps: [
      'Open diner search and a browse page (e.g. a city or cuisine hub). Pick a restaurant card with a review count.',
      'Open that restaurant page. Confirm the card count matches the published review count on the page (no inflated seeded number like 96).',
    ],
  },
  {
    id: 'rel-3d-picker-label',
    gate: 'required',
    group: 'Diner web',
    label: '3D table picker labels grey tables “Not available for this booking” (QA-013)',
    steps: [
      'On a restaurant with the 3D room, start a booking for a large party and open the 3D table picker.',
      'Hover or tap a grey table (booked or too small). Confirm it says “Not available for this booking”, not “Taken”.',
    ],
  },
  {
    id: 'rel-menu-empty-rows',
    gate: 'recommended',
    group: 'Menu',
    label: 'Menu editor save blocks empty category / dish rows (QA-022)',
    steps: [
      'In Partner Hub Menu, add an empty category and an empty dish row without filling them.',
      'Save. Confirm it points to the empty row instead of saving or failing on the server.',
    ],
  },
];
