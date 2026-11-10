export const QA_CHECKLIST_RELEASE = '0.103.1';

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
    id: 'rel-agreement-checkbox-no-scroll',
    gate: 'required',
    group: 'Agreements',
    label: 'Agreement modal: I accept turns on when the checkbox is ticked, without scrolling',
    steps: [
      'On diner web Create account, open the Terms of Use review modal. Confirm there is no “Scroll to end” button or scroll hint, and the “I have read and agree … (version N)” checkbox is clickable right away.',
      'Without scrolling, tick the checkbox. Confirm I accept turns on; untick it and confirm I accept turns off. Accept and finish signup.',
      'Repeat on Partner Hub /register Confirm and owner /agreements/sign. Open an already-signed agreement and confirm Done is not blocked.',
    ],
  },
];
