export const QA_CHECKLIST_RELEASE = '0.100.1';

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
    id: 'rel-agreement-modal-signup',
    gate: 'required',
    group: 'Agreements',
    label: 'Signup: signature above checkbox; accept opens scroll-gated modal',
    steps: [
      'Open diner web Create account (/login?tab=register). Confirm the signature pad (Type name / Draw) appears above the accept checkbox, and the full LEGAL AGREEMENT HTML is not embedded in the form.',
      'Check “I have read and accept…”. Confirm a modal opens with the agreement. Confirm “I accept” is disabled until you scroll to the bottom (or use Scroll to end). After accept, the checkbox stays checked.',
      'Repeat on Partner Hub /register Confirm step for the Partner Agreement. Confirm PDF (A4) download works from inside the modal on both flows.',
    ],
  },
  {
    id: 'rel-agreement-modal-resign',
    gate: 'required',
    group: 'Agreements',
    label: 'Re-sign pages use signature-first + scroll-gated accept modal',
    steps: [
      'As a diner who must re-sign Terms of Use, open /agreements/sign. Confirm the signature card is above the accept checkbox; the full agreement is not always expanded inline.',
      'Check accept → modal → Scroll to end → I accept. Confirm Sign stays disabled until both signature and accept are done, then sign successfully.',
      'As an owner who must re-sign the Partner Agreement, repeat on Partner Hub /agreements/sign.',
    ],
  },
  {
    id: 'rel-agreement-view-no-scroll-gate',
    gate: 'required',
    group: 'Agreements',
    label: 'Viewing an already-signed agreement does not require scroll-to-end',
    steps: [
      'As an owner who already signed the current Partner Agreement, open /agreements/sign and click View agreement.',
      'Confirm Done is enabled without scrolling to the end (Cancel also closes).',
      'Optional: same check on diner /agreements/sign when Terms are already current.',
    ],
  },
];
