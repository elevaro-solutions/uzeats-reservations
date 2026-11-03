export const QA_CHECKLIST_RELEASE = '0.97.1';

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
    id: 'rel-create-duplicate-email',
    gate: 'required',
    group: 'Restaurants',
    label: 'Add restaurant: an email that already exists points at the owner email, not Internal server error',
    steps: [
      'As Super Admin, open Admin → Restaurants → Add restaurant. Choose New owner and use an email that already has an account. Fill the rest of the wizard with a valid address and at least one cuisine, then Create restaurant.',
      'Confirm you stay on the Owner step and the Email field says the address is already registered. Confirm the toast is not “Internal server error”.',
      'Switch to Existing account, pick that owner, and confirm Create restaurant succeeds (or a different, specific error — not a blank internal error).',
    ],
  },
  {
    id: 'rel-create-duplicate-phone',
    gate: 'required',
    group: 'Restaurants',
    label: 'Add restaurant: a phone that already exists points at the owner phone',
    steps: [
      'Start Add restaurant with a new email and a phone number already saved on another account (US format, 10 digits). Complete the wizard and Create restaurant.',
      'Confirm you return to the Owner step and Phone explains the number is already registered (use a different number, leave it blank, or link the existing account). Confirm the message is not “Internal server error”.',
      'Clear the phone (or enter a new one) and confirm the restaurant can be created.',
    ],
  },
  {
    id: 'rel-create-review-cuisine',
    gate: 'required',
    group: 'Restaurants',
    label: 'Add restaurant Review lists the cuisines you selected',
    steps: [
      'On Add restaurant, select one or more cuisines on Details, then continue to Review.',
      'Confirm the Restaurant card shows those cuisine names (not an em dash).',
      'Go back, change the cuisine, and confirm Review updates.',
    ],
  },
  {
    id: 'rel-deposit-cap',
    gate: 'required',
    group: 'Restaurants',
    label: 'Deposit amount cannot exceed $100,000',
    steps: [
      'On Add restaurant → Location (or restaurant profile deposit), turn Deposit required on and enter 100001.',
      'Confirm the field rejects it with a message that the amount cannot be more than $100,000, and the request is not sent as Internal server error.',
      'Enter 100000 (or a smaller amount) and confirm the value is accepted.',
    ],
  },
  {
    id: 'rel-install-bar-store',
    gate: 'required',
    group: 'Diner web',
    label: 'Mobile install bar opens the matching store, or downloads when the device is unknown',
    steps: [
      'On diner web at phone width, with the install bar visible (clear site data if it was dismissed), use an iPhone or iPhone user-agent. Confirm copy mentions the App Store and Install opens the Tablevera App Store page.',
      'Repeat with an Android user-agent. Confirm copy mentions Google Play and Install opens the Play listing.',
      'On a narrow desktop window (unknown device), confirm one Install button goes to the downloads page (both store badges), not a guessed store.',
    ],
  },
  {
    id: 'rel-overview-url-wrap',
    gate: 'required',
    group: 'Partner Hub',
    label: 'Restaurant Overview wraps a long public URL inside the card',
    steps: [
      'Open a restaurant Overview in Partner Hub (owner or admin) that shows a long public URL in About / Contact.',
      'Narrow the window. Confirm the URL wraps inside the card and does not spill past the card edge.',
      'Confirm other external links in those cards wrap the same way.',
    ],
  },
];
