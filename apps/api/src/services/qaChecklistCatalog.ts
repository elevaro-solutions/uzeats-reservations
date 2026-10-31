export const QA_CHECKLIST_RELEASE = '0.95.0';

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
    id: 'rel-mobile-delete-account-link',
    gate: 'required',
    group: 'Added',
    label: 'Diner mobile: Profile → Delete account opens tablevera.online/profile',
    steps: [
      'Install the latest diner app build (TestFlight or dev client). Sign in as a diner. Open the Profile tab. Under Account, confirm a red “Delete account” row with a trash icon appears below Change password / Add a password.',
      'Tap Delete account. Confirm the phone’s browser opens https://tablevera.online/profile. If the browser is not signed in, the site asks you to log in, then returns to the profile page.',
      'On the web profile page, confirm the Delete account section and button are visible. Using a disposable diner account only: delete it, confirm success, then confirm that account can no longer sign in on web or in the app.',
    ],
  },
  {
    id: 'rel-web-waitlist-already-joined',
    gate: 'required',
    group: 'Fixed',
    label: 'Diner web: joining a waitlist you are already on shows a warning with a link',
    steps: [
      'On diner web, sign in as a diner. Open a restaurant with waitlist enabled, pick a date and party size, and tap Join waitlist. Confirm the success message (with position / wait estimate when available).',
      'Tap Join waitlist again for the same restaurant and date. Confirm a warning appears saying you are already on the waitlist, with a “View my waitlist” link. Click the link: /waitlist opens and lists the entry.',
      'Trigger another failure (e.g. stop the API or use a restaurant with waitlist disabled). Confirm an error message appears instead of nothing happening.',
    ],
  },
];
