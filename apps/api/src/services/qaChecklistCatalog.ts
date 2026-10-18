export const QA_CHECKLIST_RELEASE = '0.87.0';

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
    id: 'rel-version',
    gate: 'required',
    group: 'Partner Hub / Admin',
    label: 'App version under the sidebar opens release notes, with filters for new features, updates, and fixes',
    steps: [
      'Sign in as an owner. Confirm the app version sits under the sidebar.',
      'Click the version. Confirm the release notes page opens.',
      'Filter new features, updates, and fixes. Confirm each filter shows only that kind of note.',
      'Sign in as an admin and repeat. The version and the same page are there.',
    ],
  },
  {
    id: 'rel-accounts',
    gate: 'required',
    group: 'Partner Hub / Admin',
    label: 'Platform accounts lists every platform role, including QA, when no role is selected',
    steps: [
      'Sign in as a super admin and open Admin → Platform accounts.',
      'Clear the role filter.',
      'Confirm admin, account manager, super admin, and QA accounts are all listed.',
      'Select QA only and confirm the list narrows to QA accounts.',
    ],
  },
  {
    id: 'rel-qa-item',
    gate: 'required',
    group: 'QA checklist',
    label: 'Opening a checklist item shows its steps, when it was completed, and an optional note',
    steps: [
      'Open /admin/qa as a super admin or QA user.',
      'Confirm the list shows the label and status, and does not show the steps.',
      'Open an item. Confirm the panel shows the steps, the completion time, and an optional note.',
      'Save a note and confirm the list shows that a note was added.',
      'Check the item and confirm a completion time appears. Uncheck it and confirm the time clears.',
    ],
  },
  {
    id: 'rel-qa-latest',
    gate: 'required',
    group: 'QA checklist',
    label: 'The checklist shows only the latest release; older releases are on Versions, and the QA guide explains how to test',
    steps: [
      'On /admin/qa, confirm the release block is only the latest shipped version.',
      'Open Versions from the QA sidebar. Confirm each release has a date, title, tags, and a copy link.',
      'Open QA guide. Confirm it covers how to test, practical tips, and how to report a problem.',
    ],
  },
  {
    id: 'rel-qa-view',
    gate: 'required',
    group: 'Fixes',
    label: 'Viewing as a QA account opens the QA checklist, not the restaurant owner sidebar',
    steps: [
      'As a super admin, use View as on a QA account.',
      'Confirm the session opens the QA checklist.',
      'Confirm the sidebar is the QA menu (checklist, Versions, Guide), not the restaurant owner sidebar.',
      'Confirm the checklist loads during that session.',
    ],
  },
  {
    id: 'rel-qa-account',
    gate: 'required',
    group: 'Fixes',
    label: 'Super admins can create and edit QA accounts',
    steps: [
      'As a super admin, create a user with role QA and no restaurant.',
      'Confirm the account saves and is not rejected as an invalid role.',
      'Edit that account and confirm the change saves.',
      'Sign in as the new QA user and confirm they land on the checklist.',
    ],
  },
];
