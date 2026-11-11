export const QA_CHECKLIST_RELEASE = '0.106.0';

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
    id: 'rel-menu-add-dish-collapsed',
    gate: 'required',
    group: 'Partner Hub menu',
    label: 'Adding a dish saves even when other dishes were never expanded (QA row 29)',
    steps: [
      'As an owner, open Partner Hub → Menu. Pick a category with 2+ dishes and do NOT expand any of them.',
      'Click Add dish, fill name and price, and click Save menu. Confirm “Menu saved” and no “Dish 1 … needs a name” or “reading ‘trim’” error.',
      'Reload the page. Confirm the new dish and every existing dish in every category are still there.',
      'As Admin, open Admin → Restaurants → (restaurant) → Menu, save without expanding any dish, reload, and confirm no dishes disappeared.',
    ],
  },
  {
    id: 'rel-billing-readable-errors',
    gate: 'required',
    group: 'Partner Hub billing',
    label: 'Start trial and plan upgrade show a readable reason instead of “Internal server error” (rows 16, 19)',
    steps: [
      'On Partner Hub → Billing for a restaurant with no subscription, click Start 30-day trial. Confirm it starts, or shows a specific reason (not “Internal server error”).',
      'On a restaurant with an active plan, upgrade to a higher plan. Confirm the upgrade completes (or opens payment), or shows a specific reason.',
      'Switch to a restaurant you do not own (or use a stale ?restaurant= id) and retry. Confirm the message is “Forbidden” or “Restaurant not found”.',
    ],
  },
  {
    id: 'rel-floor-duplicate-fixture-bounds',
    gate: 'required',
    group: 'Partner Hub floor plan',
    label: 'Duplicated tables and new fixtures land inside the visible canvas (rows 24, 34)',
    steps: [
      'Open Partner Hub → Floor plan. Select a table and click Duplicate. Confirm the copy appears right next to it (below or beside) with a small gap, inside the canvas.',
      'Duplicate a table near the right and bottom edges. Confirm the copy still stays inside the canvas; on a full canvas confirm “No room on the canvas” appears.',
      'Add each fixture type (bar, kitchen, wall, window…). Confirm each appears inside the canvas, not below or to the right of the grid.',
    ],
  },
  {
    id: 'rel-floor-rotated-overlap-bounds',
    gate: 'required',
    group: 'Partner Hub floor plan',
    label: 'Rotated tables: overlaps are flagged and they cannot leave the canvas (row 32)',
    steps: [
      'Rotate two tables (R key or the rotate handle) and drag one onto the other. Confirm both get a red outline, the toolbar shows “N overlapping”, and Publish is blocked.',
      'Drag a table onto a bar or wall fixture. Confirm it is flagged as overlapping too (a door or window on a wall is not flagged).',
      'Turn a long table 90° and drag it to each edge. Confirm no part goes past the canvas. Rotate a table sitting at an edge and confirm it moves back inside.',
    ],
  },
  {
    id: 'rel-floor-save-errors',
    gate: 'required',
    group: 'Partner Hub floor plan',
    label: 'Save draft and Publish show what to fix instead of a raw server error (row 25)',
    steps: [
      'Make a change and click Save draft. Confirm “Draft saved”.',
      'Clear a fixture name, then Save draft. Confirm it saves (the name falls back to the fixture type) with no raw error.',
      'If any save fails, confirm the message names the problem (e.g. which table) rather than a technical error.',
    ],
  },
  {
    id: 'rel-virtual-room-square',
    gate: 'required',
    group: 'Virtual 3D room',
    label: 'Tables a few degrees off square render straight in 3D; rotation snaps to right angles (row 31)',
    steps: [
      'On the floor plan, drag the rotate handle slowly near 0°/90°. Confirm it snaps onto the right angle within a few degrees; hold Shift to step by 15°.',
      'Open Partner Hub → Virtual 3D room. Confirm tables look evenly aligned (not slightly crooked) and newly placed tables do not overlap their neighbours’ chairs.',
    ],
  },
  {
    id: 'rel-promo-create-validation',
    gate: 'required',
    group: 'Partner Hub marketing',
    label: 'New promotion explains bad input next to the field instead of “Internal server error” (row 26)',
    steps: [
      'Open Partner Hub → Marketing → Promotions → New promotion.',
      'Fill both Discount % and fixed amount. Confirm the form says to use one or the other.',
      'Set an end date before the start date, and a code with a space. Confirm each shows an error under its field.',
      'Use a code another promotion at this restaurant already uses. Confirm “Code … is already used by …” appears under Promo code.',
      'Fill valid values and save. Confirm “Promotion created”.',
    ],
  },
  {
    id: 'rel-promo-weekdays-and-clear',
    gate: 'required',
    group: 'Partner Hub marketing',
    label: 'Promo weekday limits are enforced; clearing Max redemptions removes the limit (rows 27, 28)',
    steps: [
      'Create a promotion with a code limited to one weekday. On diner web, book a time on a different weekday with that code. Confirm it is rejected with “not valid on this day of the week”.',
      'Book on the allowed weekday with the code, then try to move the booking to another weekday. Confirm the move is blocked with an explanation.',
      'Edit a promotion that has Max redemptions set, clear the field, and save. Reopen it and confirm Max redemptions is empty and the table shows no limit.',
    ],
  },
  {
    id: 'rel-widget-promo',
    gate: 'required',
    group: 'Booking widget',
    label: 'Booking widget checks the promo code and passes time + valid code to Tablevera (row 30)',
    steps: [
      'Embed the widget from Partner Hub → Booking widget on a restaurant that takes a deposit.',
      'Pick a time, then type an active code. Confirm “Code applied: $… off your deposit”. Type an inactive or wrong-day code and confirm the reason is shown.',
      'With a valid code, click Complete reservation. Confirm Tablevera opens with the same date, party, time, and promo code already filled.',
    ],
  },
  {
    id: 'rel-reservations-integrations',
    gate: 'required',
    group: 'Partner Hub',
    label: 'Reservations “All dates” lists bookings; creating an integration partner works (rows 23, 35)',
    steps: [
      'Open Partner Hub → Reservations. With Today showing a booking, switch to All dates. Confirm the list shows that booking and older ones (no empty table).',
      'Open Partner Hub → Integrations with a restaurant selected. Click New integration, fill name and provider, and create. Confirm the API key dialog appears.',
      'Switch to All restaurants. Confirm New integration is disabled.',
    ],
  },
  {
    id: 'rel-ui-composer-hub-cards',
    gate: 'recommended',
    group: 'Partner Hub UI',
    label: 'Message box corners match the Send button; hub cards are equal height (rows 2, 6)',
    steps: [
      'Open Partner Hub → Messages on a conversation. Confirm the message box and Send button read as one control with matching outer corners and the same height.',
      'Open Partner Hub → Grow (and Settings, Insights). Confirm cards in each row are the same height and long descriptions are cut to two lines.',
    ],
  },
];
