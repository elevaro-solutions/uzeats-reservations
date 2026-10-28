export const QA_CHECKLIST_RELEASE = '0.92.2';

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
    id: 'rel-cookie-customize-hides-banner',
    gate: 'required',
    group: 'Cookie consent',
    label: 'Customize on the cookie banner hides the banner while Cookie preferences is open',
    steps: [
      'Open diner web in a private window (or clear site cookies and local storage) so the cookie banner shows.',
      'Click Customize. Confirm the Cookie preferences dialog opens and the cookie banner is no longer visible on top of or behind it.',
      'Close the dialog without saving (X or click outside). Confirm the cookie banner comes back.',
      'Click Customize again, change a toggle, and save. Confirm the dialog closes and the banner does not come back after a reload.',
    ],
  },
  {
    id: 'rel-cookie-prefs-closable',
    gate: 'required',
    group: 'Cookie consent',
    label: 'Cookie preferences dialog can always be closed, including on a first visit',
    steps: [
      'In a fresh private window (no cookie choice saved), open the banner and click Customize.',
      'Confirm the dialog has a close (X) button. Click it and confirm the dialog closes.',
      'Click Customize again and click outside the dialog (on the dimmed area). Confirm the dialog closes.',
      'Accept or save a choice, then reopen Cookie preferences from the footer link. Confirm X and click-outside still close it.',
    ],
  },
  {
    id: 'rel-restaurant-card-slots',
    gate: 'required',
    group: 'Diner web',
    label: 'Restaurant card quick time slots are not cut off on narrow cards',
    steps: [
      'Open diner web home or a city hub on a desktop window about 1200px wide so restaurant cards show 4 per row.',
      'Find a card with three quick time slots such as “11:30 AM”. Confirm all three labels are fully visible (no clipped text or ellipsis).',
      'Resize to phone width. Confirm cards switch to the row layout (photo on the left) and the slots still fit. Loading skeleton cards use the same side padding.',
    ],
  },
];
