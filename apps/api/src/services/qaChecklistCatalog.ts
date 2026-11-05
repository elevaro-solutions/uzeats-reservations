export const QA_CHECKLIST_RELEASE = '0.101.0';

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
    id: 'rel-default-card-setup',
    gate: 'required',
    group: 'Billing',
    label: 'Default payment card: Billing card and required setup guide step',
    steps: [
      'Sign in as an owner of a venue with no saved card (an admin-created trial venue works). Open the setup guide → Set up payments. Confirm a required “Add a default payment card” step, and that the plan step is now just “Choose a plan”.',
      'Open Billing. Confirm the Default payment method card. Add a test card through Stripe and confirm it shows brand, last 4, and expiry, and the setup step turns done.',
      'Replace the card with another test card. Confirm the new card shows. If the venue has an open invoice, confirm it is retried right away after saving.',
    ],
  },
  {
    id: 'rel-auto-charge-failed-alert',
    gate: 'required',
    group: 'Billing',
    label: 'Failed automatic charge alerts the owner and shows a red banner with the next retry',
    steps: [
      'On a test venue, save a Stripe decline card (e.g. 4000 0000 0000 0341) as default, then trigger an invoice auto-charge (due invoice, SMS credits, or 3D room).',
      'Confirm the owner gets an email and in-app alert with the bank reason, the next retry date, and Replace card / Pay now links. Billing and the invoice detail show a red “Automatic charge failed” banner.',
      'Use a lost/stolen/expired test card (e.g. 4000 0000 0000 9987). Confirm a second alert and the banner says retries are paused until the card is replaced. If Stripe is stubbed, note “stubbed”.',
    ],
  },
  {
    id: 'rel-admin-failed-charges',
    gate: 'required',
    group: 'Billing',
    label: 'Admin → Billing Failed charges list and admin billing alerts',
    steps: [
      'As Super Admin or account manager, open Admin → Billing. Confirm a Failed charges list with restaurant, invoice, amount, reason, attempts, last attempt, and next retry.',
      'Confirm the failed charge from the previous task appears, and that admins got a billing alert for the first failure.',
      'Open Admin → Email templates. Confirm card_charge_failed, card_action_required, card_expiring, trial_card_missing, and billing_admin_alert are listed and editable.',
    ],
  },
  {
    id: 'rel-buy-addon-declined-card',
    gate: 'required',
    group: 'Billing',
    label: 'SMS credits / 3D room with a declined saved card opens the card form',
    steps: [
      'With a declined card saved as default, buy SMS credits on Partner Hub.',
      'Confirm the card form opens (no error toast). Pay with a working test card and confirm the credits are added.',
      'Repeat once for turning on the 3D room if available in this env.',
    ],
  },
  {
    id: 'rel-all-restaurants-scope',
    gate: 'required',
    group: 'Partner Hub',
    label: 'Multi-restaurant owners land on All restaurants; alerts follow the selected restaurant',
    steps: [
      'Sign in as an owner or manager with 2+ restaurants. Confirm the header shows All restaurants, and Overview, My restaurants, Reservations, Waitlist, and Billing show every location together, with the rest of the menu hidden.',
      'Pick one restaurant in the header. Confirm the full menu comes back. Open a URL with ?restaurant=<id> and confirm only that restaurant loads.',
      'Switch restaurants and confirm the header bell and Overview Unread alerts change to that restaurant plus account alerts. Mark all read clears only that restaurant; All restaurants shows every alert.',
    ],
  },
  {
    id: 'rel-pay-all-all-restaurants',
    gate: 'required',
    group: 'Billing',
    label: 'Pay all invoices across restaurants in one charge without double-charging',
    steps: [
      'With 2+ restaurants that each have an open invoice, select All restaurants and open Billing. Confirm Pay all invoices covers every restaurant’s open invoices.',
      'Pay with a test card. Confirm the button stays on “Payment received” and then confirms once every invoice is Paid.',
      'Click again (or reload and retry). Confirm it does not try to charge that payment a second time. Repeat once with a single restaurant selected.',
    ],
  },
  {
    id: 'rel-live-floor-tables-view',
    gate: 'required',
    group: 'Floor',
    label: 'Live floor Tables view: chair tiles, status colors, and drag to seat',
    steps: [
      'Open Partner Hub Live floor. Confirm Tables is the default view, each table is a tile with one chair per max seat, and status colors are green Available, amber Reserved, red Seated, blue Turning (labeled “Available”, not “free”).',
      'Confirm busy tiles show guest name, party size, and reservation time or turn time left; free tiles show the next booking (“Next 7:30 PM · Party 4”).',
      'Drag an arriving guest onto a table. Confirm tables that fit the party are outlined while dragging and the guest is seated on drop.',
    ],
  },
  {
    id: 'rel-live-floor-table-drawer',
    gate: 'required',
    group: 'Floor',
    label: 'Live floor table drawer: seat, complete, upcoming today, and edit links',
    steps: [
      'Click a seated table. Confirm the drawer shows the table card, the current guest with Seat here / Complete, and No-show / Refund deposit / Cancel below. The ⋯ menu has Edit table and Open in table layout.',
      'Click a free table. Confirm arriving guests list with Seat here (too-big parties greyed out) and Upcoming today reservations with links and Seat now for early arrivals.',
      'Choose Edit table. Confirm Tables & shifts opens the edit form for that table (?editTable=). Sign in as a host and confirm the ⋯ edit items are hidden.',
    ],
  },
  {
    id: 'rel-online-ordering-switch',
    gate: 'required',
    group: 'Online ordering',
    label: 'Online ordering card: Live/Off switch, tracked link, and diner button',
    steps: [
      'Open Partner Hub Menu → Online ordering. Paste a DoorDash / Uber Eats / Toast link and save. Confirm it turns Live automatically and shows a copyable tracked link with utm_source, utm_medium=reservations, utm_campaign=order_online.',
      'Open the diner restaurant page. Confirm a full-width “Order online · Takeout & delivery” button above Call / Directions / Website / Message, and the opened link keeps the original parameters plus the UTM tags.',
      'Turn the switch Off and confirm the diner button disappears but the link stays saved. Clear the URL (and Full menu URL) and confirm the diner link is removed. Confirm a host cannot change the switch.',
    ],
  },
  {
    id: 'rel-menu-editor-tools',
    gate: 'required',
    group: 'Menu',
    label: 'Menu editor: search/filter, reorder, Popular star, and Unsaved changes bar',
    steps: [
      'Open Partner Hub Menu. Search by dish name or dietary tag and filter to Popular or Unavailable. Confirm category counts and the Featured dishes meter (x / 10) stay correct while filtered.',
      'Move a dish and a category up/down, star a dish as Popular, and use Add dish (name field focused). Confirm the Unsaved changes bar with Discard / Save menu, and a warning when leaving or switching restaurants.',
      'Leave a never-opened dish without a price (or add a blank dish) and Save. Confirm it jumps to that dish instead of failing on the server. Delete a dish and a category (⋯ menu) and confirm both ask for confirmation.',
    ],
  },
  {
    id: 'rel-diner-home-stats',
    gate: 'required',
    group: 'Diner web',
    label: 'Diner home hero shows live totals under the search box',
    steps: [
      'Open the diner web home page. Confirm a row under the search box with bookable restaurants, cities, diners served, and average rating.',
      'Confirm any total that is zero is hidden (not shown as 0).',
      'If you can block the API request (DevTools), confirm the row is hidden instead of showing an error.',
    ],
  },
  {
    id: 'rel-admin-package-stale-stripe',
    gate: 'required',
    group: 'Admin',
    label: 'Admin package / paid-period change works when the Stripe subscription is gone',
    steps: [
      'As Super Admin, pick a restaurant whose Stripe subscription was deleted or created in the other Stripe mode (sandbox vs live).',
      'Open Admin → Restaurants → Package. Change the package, then the paid period start. Confirm both save without “No such subscription: sub_…”.',
      'Confirm the saved card still shows on Billing if the Stripe customer exists.',
    ],
  },
  {
    id: 'rel-telegram-timezone',
    gate: 'recommended',
    group: 'Integrations',
    label: 'Telegram bot reservation times use the restaurant timezone',
    steps: [
      'In an env with the Telegram bot connected, create an evening reservation (e.g. 7:00 PM) for a US-east restaurant.',
      'Confirm the bot card and Active reservations list show “Nov 5, 2026, 7:00 PM EST”-style time matching Partner Hub, not UTC or the next day.',
      'Skip if the bot is not connected here; note “bot not configured”.',
    ],
  },
  {
    id: 'rel-card-reminders',
    gate: 'recommended',
    group: 'Billing',
    label: 'Trial-ends-without-card and card-expiring reminders, and 3D Secure Confirm payment link',
    steps: [
      'On a trial venue ending in ~3 days with no default card, confirm the trial_card_missing reminder (email log or inbox).',
      'With a default card expiring within ~30 days, confirm the card_expiring warning.',
      'Use a 3D Secure test card for a renewal and confirm the owner gets a Confirm payment link. Skip items you cannot trigger; note which.',
    ],
  },
];
