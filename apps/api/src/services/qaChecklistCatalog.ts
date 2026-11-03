export const QA_CHECKLIST_RELEASE = '0.99.0';

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
    id: 'rel-qa-dashboard',
    gate: 'required',
    group: 'QA Hub',
    label: 'QA Dashboard shows run counts, average progress, current gate, and recent sign-offs',
    steps: [
      'Sign in as Super Admin or QA. Confirm the QA sidebar starts with Dashboard, then Checklist, History, Issues, Versions, Guide.',
      'Open /admin/qa/dashboard (or land there after a QA-role login). Confirm run counts, average required progress, current-gate progress, and a recent sign-offs section.',
      'From the dashboard, use links to Checklist and History. Confirm they open the live gate and the history list.',
    ],
  },
  {
    id: 'rel-qa-history-prior-run',
    gate: 'required',
    group: 'QA Hub',
    label: 'QA History keeps prior checklist tasks, notes, progress, and sign-off',
    steps: [
      'Open /admin/qa/history. Confirm a filterable run list (All / Active / Signed) and a detail panel (not a stacked accordion only).',
      'Select a prior release run (e.g. 0.98.0). Confirm its tasks, notes, progress, and sign-off (if any) still appear after this deploy.',
      'Use Open checklist / /admin/qa?release=… for that version. Confirm the prior catalog items load, not only the new 0.99.0 gate.',
    ],
  },
  {
    id: 'rel-qa-catalog-snapshot',
    gate: 'required',
    group: 'QA Hub',
    label: 'Live gate is 0.99.0 while unfinished prior-version work stays on its own run',
    steps: [
      'Open /admin/qa with no release query. Confirm the checklist title / release is 0.99.0 and the tasks match this gate (QA Hub + fail-to-pay View as).',
      'Check one required item and save a short note on the live gate. Reload. Confirm the check and note persist.',
      'Return to History for an older Active run. Confirm its unfinished items were not replaced by the 0.99.0 catalog.',
    ],
  },
  {
    id: 'rel-view-as-fail-to-pay',
    gate: 'required',
    group: 'Partner Hub',
    label: 'Platform admin View as reaches Settings even when the venue is fail-to-pay locked',
    steps: [
      'As Super Admin, find a test restaurant that is fail-to-pay restricted or terminated (Billing lock for owners). Use View as for that venue’s owner/manager.',
      'While impersonating, open Settings (and another non-billing page such as Overview or Floor). Confirm you are not forced to stay only on Billing.',
      'Exit impersonation. Confirm the admin session returns normally.',
    ],
  },
  {
    id: 'rel-fail-to-pay-redirect-copy',
    gate: 'required',
    group: 'Partner Hub',
    label: 'Owners locked by fail-to-pay see which page they tried and why Billing opened',
    steps: [
      'Sign in as the owner or manager of a restricted/terminated test venue (not View as). Try to open Settings (or another locked page).',
      'Confirm you land on Billing with a toast and/or banner that names the page you tried (e.g. Settings) and explains unpaid invoices limit Partner Hub until they pay.',
      'Confirm Billing itself still loads invoices / pay actions for that venue.',
    ],
  },
];
