export const QA_CHECKLIST_RELEASE = '0.97.0';

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
    id: 'rel-visibility-activity-search',
    gate: 'required',
    group: 'Restaurant listing',
    label: 'Not visible hides search and public page; Inactive keeps the page but blocks booking',
    steps: [
      'As Super Admin, open Admin → Restaurants. Pick an approved, Visible, Active test venue. Confirm Visible / Active tags on the row.',
      'More → Not visible, enter a reason, confirm. Confirm diner search no longer lists it and opening /restaurants/{id} does not show the normal public page. Set Visible again with a reason.',
      'More → Inactive, enter a reason. Confirm it is out of diner search, the public page still loads, Complete reservation is disabled, and copy says the restaurant is not accepting reservations. Set Active again.',
    ],
  },
  {
    id: 'rel-standing-listing-menu',
    gate: 'required',
    group: 'Restaurant listing',
    label: 'Standing and Listing are separate; Suspend / Approve move listing flags',
    steps: [
      'On an approved restaurant, open More. Confirm Standing (Approve / Reject / Suspend) is separate from Listing (Visible / Active). Confirm Listing items are hidden when the venue is pending, rejected, or suspended.',
      'Suspend with a reason. Confirm status is Suspended, tags show Not visible and Inactive, diner search hides it, and the public page shows the closed booking card (calendar icon, no reservation form).',
      'Approve with a reason (or Approve from the menu). Confirm Visible and Active again and the reservation form returns. Bulk bar uses the same Standing / Listing labels.',
    ],
  },
  {
    id: 'rel-listing-reason-audit',
    gate: 'required',
    group: 'Restaurant listing',
    label: 'Reject, Suspend, Not visible, Active, and Inactive require a reason',
    steps: [
      'From Admin → Restaurants More menu, open Reject, Suspend, Not visible, Active, or Inactive. Confirm a confirmation asks for a reason and Cancel leaves the venue unchanged.',
      'Submit with a short reason. Confirm the action applies and each menu item still has an icon and tooltip.',
      'Skip deep audit-log inspection unless you have access; note “reason UI verified” if the log page is unavailable.',
    ],
  },
  {
    id: 'rel-app-store-badges',
    gate: 'required',
    group: 'Downloads',
    label: 'App Store badges open live iPhone apps (diner web and Partner Hub)',
    steps: [
      'On diner web /downloads, confirm App Store and Google Play badges are links (not “coming soon”). On an iPhone or with an iPhone user-agent, open the App Store badge and confirm it goes to the Tablevera diner app.',
      'Check footer, install bar (phone width), profile, reservations, for-restaurants, and pricing for live store links where badges appear.',
      'On Partner Hub sign-in, confirm store badges. On a signed-in account menu / small-screen sidebar, open Partner app and confirm App Store on iPhone (Play otherwise).',
    ],
  },
  {
    id: 'rel-admin-invoice-detail',
    gate: 'required',
    group: 'Billing',
    label: 'Admin invoice detail shows amount hero, one status, and two-column layout',
    steps: [
      'As Super Admin, open Admin → Invoices → an unpaid invoice with line items.',
      'Confirm a clear amount hero, status appears once in the header (not repeated in a descriptions grid), pay-link actions are compact, and Details / Line items sit in two columns.',
      'Open a paid invoice and confirm the same layout still reads cleanly.',
    ],
  },
  {
    id: 'rel-base-plan-upgrade',
    gate: 'required',
    group: 'Billing',
    label: 'Free Base plan hides paid cycle and can upgrade even after a leftover period date',
    steps: [
      'Use a restaurant on the free Base plan. Open Partner Hub Billing. Confirm no paid billing-cycle dates are shown for Base.',
      'Open Admin → Plans & pricing (or create/edit a $0 package). Confirm billing duration is hidden when price is $0.',
      'From Billing, switch off Base to a paid plan “right away”. Confirm the upgrade is allowed even if an old period end date is in the past, and the new plan starts now (not blocked with “next upgrade after …”).',
    ],
  },
  {
    id: 'rel-invoice-due-utc',
    gate: 'required',
    group: 'Billing',
    label: 'Invoice due dates show as UTC calendar days (not a past local date in grace)',
    steps: [
      'Open an unpaid period invoice on Partner Hub Billing or Admin → Invoices (and the public /invoice pay page if available).',
      'Confirm “Payment due” / due date matches the UTC calendar day (typically the 1st) and does not jump a day earlier in a US timezone.',
      'During grace after that UTC day, confirm copy does not tell the partner to pay by a date that already passed solely because of local timezone.',
    ],
  },
  {
    id: 'rel-pay-terminal-intent',
    gate: 'required',
    group: 'Billing',
    label: 'Invoice pay and Billing Pay now never open Stripe with a finished PaymentIntent',
    steps: [
      'On the public /invoice pay page, complete a card payment that needs 3DS (or return from a succeeded redirect). Confirm a finished PaymentIntent marks the invoice paid (or a fresh form appears) — no Stripe “terminal state” Elements error.',
      'On Partner Hub Billing, open Pay now / Complete your plan switch when a charge is due. Confirm the card form mounts only with a usable intent; a already-succeeded charge clears the balance instead of breaking the modal.',
      'If Stripe is stubbed in this env, write “stubbed — no live Elements” in the note after confirming Pay now still does not crash.',
    ],
  },
  {
    id: 'rel-widget-dev-race',
    gate: 'recommended',
    group: 'Dev',
    label: 'Root pnpm dev no longer fails on widget dist race',
    steps: [
      'On a local machine only: from repo root run `pnpm dev` and wait until web and widget settle.',
      'Confirm web starts and `apps/web/public/widget.js` exists without ENOENT / predev copy failures.',
      'Skip on staging-only QA; write “skipped — staging” in the note.',
    ],
  },
];
