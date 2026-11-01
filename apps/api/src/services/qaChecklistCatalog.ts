export const QA_CHECKLIST_RELEASE = '0.96.0';

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
    id: 'rel-online-order-url',
    gate: 'required',
    group: 'Restaurant listing',
    label: 'Online order URL shows an Order online button on the public restaurant page',
    steps: [
      'As an owner, open Restaurant profile → Contact. Confirm Online order URL is next to Website (not Menu). Save a DoorDash / Uber Eats / Toast https link. Confirm Website can still be the restaurant homepage.',
      'Open the public diner listing. Confirm an Order online action (and Details / contact row) opens that URL in a new tab. Website still opens the restaurant site.',
      'Clear Online order URL and save. Reload the diner page. Confirm Order online is gone. Repeat from Admin → restaurant Contact if you have Super Admin access.',
    ],
  },
  {
    id: 'rel-view-invoice-cancelled',
    gate: 'required',
    group: 'Billing',
    label: 'Cancelled Billing still lists invoices and View invoice opens the unpaid bill',
    steps: [
      'Use a test restaurant with an unpaid platform invoice and a cancelled (or ended) subscription. Open Partner Hub Billing.',
      'Confirm plan cards are shown, Usage & invoices is still listed (not hidden), and an outstanding-balance alert includes View invoice. Click it and confirm the unpaid invoice page opens.',
      'In Danger zone, try Delete restaurant while that balance remains. Confirm the error includes View invoice and the venue is not deleted.',
    ],
  },
  {
    id: 'rel-stripe-hosted-invoice',
    gate: 'required',
    group: 'Billing',
    label: 'Platform invoices create a Stripe invoice with number, amount, period, and due date',
    steps: [
      'As admin, create or open a platform invoice with a positive amount (manual invoice is fine) on a restaurant that has Stripe connected.',
      'In Stripe Dashboard (or the hosted invoice URL), confirm it is not blank: invoice number (INV-…), restaurant, line description, amount, billing period, and due date match Tablevera.',
      'Pay the invoice in Partner Hub (or the public /invoice link). Confirm Tablevera marks it paid and the Stripe copy is paid out of band. If Stripe keys are off, write “stubbed — no hosted URL” in the note.',
    ],
  },
  {
    id: 'rel-invoice-refresh-stripe',
    gate: 'recommended',
    group: 'Billing',
    label: 'Refreshing a period invoice still updates Stripe when line items change',
    steps: [
      'On a test restaurant with an unpaid auto period invoice that already has a Stripe copy, change a line (for example add a cover or regenerate the period invoice).',
      'Confirm Tablevera still shows the invoice (not cancelled) with the new lines, and Stripe’s previous open copy is voided and replaced rather than left blank.',
      'Skip if there is no unpaid period invoice in this environment; write that in the note.',
    ],
  },
  {
    id: 'rel-core-recommended-layout',
    gate: 'required',
    group: 'Billing',
    label: 'Recommended on Core does not overlap the plan price',
    steps: [
      'Open Partner Hub Billing on a cancelled or no-plan restaurant so the plan cards show.',
      'Find the Core card. Confirm Recommended sits in the header without covering the price, and the card still has a 1px brand outline.',
      'Resize to a phone-width window. Confirm the tag and price still do not overlap.',
    ],
  },
];
