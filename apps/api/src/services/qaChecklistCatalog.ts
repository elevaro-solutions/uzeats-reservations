export const QA_CHECKLIST_RELEASE = '0.103.2';

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
    id: 'rel-qa-history-missed-run',
    gate: 'required',
    group: 'QA Hub',
    label: 'QA History lists v0.103.0 and every release since, even ones nobody opened',
    steps: [
      'Open Partner Hub /admin/qa/history. Confirm v0.103.2 (Current), v0.103.1, v0.103.0, and v0.102.0 are all listed.',
      'Select v0.103.0. Confirm it has 7 tasks (Surveys, Exports, Booking, Partner Hub) at 0/6 required, and Open checklist shows them.',
      'Select v0.103.1. Confirm its progress and notes from before this deploy are unchanged (the agreement checkbox task).',
    ],
  },
  {
    id: 'rel-qa-current-run-on-deploy',
    gate: 'required',
    group: 'QA Hub',
    label: 'The current release appears on QA Dashboard and History right after deploy',
    steps: [
      'Before opening the checklist page, open /admin/qa/dashboard. Confirm the current gate shows v0.103.2.',
      'Open /admin/qa/history and confirm v0.103.2 is listed without having visited /admin/qa first.',
    ],
  },
];
