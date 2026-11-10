export const QA_CHECKLIST_RELEASE = '0.103.0';

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
    id: 'rel-survey-publishes-review',
    gate: 'required',
    group: 'Surveys',
    label: 'Post-visit survey publishes a review when the guest has not reviewed (QA-036)',
    steps: [
      'Complete a test reservation (mark it completed) for a diner who has not reviewed that visit. Open the post-visit survey link.',
      'Submit overall, food, service, and ambience ratings plus a comment. Confirm the diner restaurant page shows a new published review with those ratings and the comment.',
      'For a visit the guest already reviewed, submit the survey. Confirm no second review is created.',
    ],
  },
  {
    id: 'rel-survey-resubmit',
    gate: 'required',
    group: 'Surveys',
    label: 'Submitting the survey twice says it was already submitted (QA-034)',
    steps: [
      'Open the same post-visit survey link used above and submit again.',
      'Confirm a clear “already submitted” message, not Internal server error.',
    ],
  },
  {
    id: 'rel-exports-excel-pdf',
    gate: 'required',
    group: 'Exports',
    label: 'Exports offer Excel and PDF only, with Tablevera branding (QA-035)',
    steps: [
      'In Partner Hub Reservations, Admin → Accounts, and Admin → Exports, confirm only Excel and PDF buttons (no JSON / CSV).',
      'Download an Excel file. Confirm the forest header band with logo and gold rule, frozen header row with filters, sized columns, no gridlines, and landscape fit-to-width print setup.',
      'Download a PDF. Confirm the branded header, forest table header with white text, striped rows, and a “tablevera.app” footer with page numbers. Confirm “—” and other punctuation print correctly (no “â”).',
    ],
  },
  {
    id: 'rel-reservations-export-columns',
    gate: 'required',
    group: 'Exports',
    label: 'Reservations export has readable columns and dollar amounts (QA-035)',
    steps: [
      'Export Reservations to Excel for a restaurant with deposits.',
      'Confirm columns Conf #, local date and time, Guest, Party size, Status, Table, Source, and amounts in dollars (not cents).',
      'Export to PDF. Confirm it prints the key columns and notes how many more columns are in Excel.',
    ],
  },
  {
    id: 'rel-access-rule-covers',
    gate: 'required',
    group: 'Booking',
    label: 'Access rules: Covers per slot is enforced and blocked party sizes hide times (QA-033)',
    steps: [
      'In Partner Hub Access rules, set Covers per slot to a small number (e.g. 4) for a test restaurant and time window.',
      'On diner web, book that slot until the cap is reached. Confirm the slot disappears or refuses more covers.',
      'Set a party-size limit on a rule (e.g. max 4). Search for a party of 6 in that window and confirm those times are hidden instead of failing at Confirm.',
    ],
  },
  {
    id: 'rel-messages-input-bottom',
    gate: 'required',
    group: 'Partner Hub',
    label: 'Messages: the message box stays at the bottom and spans full width (QA-030)',
    steps: [
      'Open Partner Hub Messages and select a conversation with only one or two messages.',
      'Confirm the message box sits at the bottom of the card and spans its full width (not floating mid-card). Repeat with a long conversation.',
    ],
  },
  {
    id: 'rel-listing-tags-hint',
    gate: 'recommended',
    group: 'Partner Hub',
    label: 'Restaurant profile → Listing explains where discovery tags are edited (QA-032)',
    steps: [
      'Open Partner Hub Restaurant profile → Listing.',
      'Confirm the note about dining style, occasion, meal, dietary, and amenity tags, and that its link opens Public profile → Discovery.',
    ],
  },
];
