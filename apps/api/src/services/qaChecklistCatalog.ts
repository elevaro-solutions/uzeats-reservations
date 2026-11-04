export const QA_CHECKLIST_RELEASE = '0.100.2';

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
    id: 'rel-partner-sign-page-live',
    gate: 'required',
    group: 'Agreements',
    label: 'Partner Hub /agreements/sign loads (no 404) and redirects to login when signed out',
    steps: [
      'Open https://dashboard.tablevera.online/agreements/sign while signed out. Confirm you land on login with next=/agreements/sign (not a Next.js 404).',
      'Sign in as a restaurant owner. Confirm the Partner Agreement signing page loads (signature + accept checkbox / modal).',
      'Open the same URL as a Super Admin. Confirm preview mode still works.',
    ],
  },
  {
    id: 'rel-partner-reminder-cta-copy',
    gate: 'required',
    group: 'Agreements',
    label: 'Partner Agreement reminder CTA says Partner Agreement, not Terms',
    steps: [
      'As Super Admin, open Partner Hub email templates and find Partner Agreement reminder (partner_agreement_reminder).',
      'Confirm the primary button label is “Review & sign Partner Agreement” (not “Review & sign Terms”).',
      'Optional: send a test email and confirm the button text and dashboard.tablevera.online/agreements/sign link.',
    ],
  },
  {
    id: 'rel-agreement-modal-still-works',
    gate: 'recommended',
    group: 'Agreements',
    label: 'Signup still uses scroll-gated accept modal after deploy',
    steps: [
      'On diner Create account, confirm signature is above the accept checkbox and the checkbox opens the scroll-gated modal.',
      'On Partner Hub /register Confirm, same pattern for Partner Agreement.',
    ],
  },
];
