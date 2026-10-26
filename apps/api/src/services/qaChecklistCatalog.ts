export const QA_CHECKLIST_RELEASE = '0.90.0';

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
    id: 'rel-issues',
    gate: 'required',
    group: 'QA issues',
    label: 'Super Admin and QA can file, edit, filter, and export bugs and features on Issues',
    steps: [
      'Sign in as a QA user. Confirm Issues is in the QA sidebar and opens /admin/qa/issues.',
      'Create an issue with a title, rich-text description, tag, severity, page path, environment, release, and a screenshot. Confirm it appears as QA-00x.',
      'Open it, change the status from the table, then edit the title and save. Confirm the list and the form both show the new values.',
      'Filter by status, severity, tag, and search (title or QA-001). Confirm the list matches. Export PDF, Excel, and Word with those filters and confirm the download includes only matching rows.',
      'Sign in as a super admin and confirm the same page is available. Sign in as an owner and confirm /admin/qa/issues is not in the menu and does not load.',
    ],
  },
  {
    id: 'rel-issues-guide',
    gate: 'required',
    group: 'QA issues',
    label: 'The checklist and QA guide point to Issues for filing bugs and features',
    steps: [
      'On /admin/qa, confirm the Issues link is in the header.',
      'Open QA guide. Confirm it tells you to file problems on Issues, with title, path, severity, tags, and a screenshot.',
      'Follow that link and confirm it opens the Issues list, not the checklist.',
    ],
  },
  {
    id: 'rel-review-email',
    gate: 'required',
    group: 'Reviews',
    label: 'New-review emails to the owner and managers include a link to that venue’s reviews in Partner Hub',
    steps: [
      'As a diner, leave a review for a restaurant that has an owner or manager with email.',
      'Open the new-review email (or the recorded stub if SendGrid is off). Confirm it includes a button or link to Partner Hub reviews for that restaurant (/reviews?restaurant=<id>).',
      'Open that link while signed in as the owner or manager. Confirm it lands on that venue’s reviews.',
      'If email is stubbed, write “stubbed” in the note. Inbox, push, and SMS can stay the short body without that dashboard URL.',
    ],
  },
  {
    id: 'rel-rich-notes',
    gate: 'required',
    group: 'Notes and messages',
    label: 'Notes, messages, and reviews use a formatting toolbar instead of a plain box',
    steps: [
      'On diner web, cancel a reservation or leave a review. Confirm the notes field has bold, lists, and links, and that saved text still shows after reload.',
      'In Partner Hub, open a reservation cancel, a guest note, or a review reply. Confirm the same toolbar and that the saved formatting still displays.',
      'On Issues, add bold and a list in the description. Save, reopen, and confirm the formatting is still there.',
    ],
  },
  {
    id: 'rel-sidebar-drawer',
    gate: 'required',
    group: 'Fixes',
    label: 'Opening a right-hand drawer does not jump or hide the Partner Hub sidebar',
    steps: [
      'Sign in as a super admin or QA user on a desktop-width window. Scroll the checklist so the sidebar stays in view.',
      'Open a checklist item (steps drawer). Confirm the sidebar does not jump up or slide away. Close the drawer and confirm the sidebar is still in the same place.',
      'Repeat on another page that opens a right-hand panel (for example a reservation cancel). Confirm the page scrolls in the main column, not the whole window.',
    ],
  },
];
