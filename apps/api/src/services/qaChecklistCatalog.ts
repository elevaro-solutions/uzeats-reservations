export const QA_CHECKLIST_RELEASE = '0.101.2';

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
    id: 'rel-docs-same-message',
    gate: 'required',
    group: 'Docs access',
    label: 'Docs sign-in shows the same message for approved, pending, denied, and unknown emails',
    steps: [
      'Signed out, open the docs /access/ page. Enter an approved email and send a code. Note the message (“If <email> is approved, a 6-digit code is on its way…”).',
      'Repeat with an unknown email, a pending email, and a denied email. Confirm the message is identical each time and only the approved email actually receives a code.',
      'Submit an access request for an unknown email. Confirm the reply is the generic “If this email can request access, we recorded it…” and the request appears as pending in Partner Hub /admin/docs-access.',
    ],
  },
  {
    id: 'rel-docs-code-rate-limit',
    gate: 'required',
    group: 'Docs access',
    label: 'Verification codes are limited to one per minute and five per hour per email',
    steps: [
      'For an approved email, send a code. Confirm the button shows “Resend code (60s)” and counts down.',
      'Resend right at 0s. Confirm a second email arrives. Use Resend within 60s from another tab (or the API) and confirm no extra email arrives.',
      'Request codes until 5 have arrived within an hour. Confirm a 6th does not arrive (the page still shows the same message). Note the time so the next tester knows the email is throttled.',
    ],
  },
  {
    id: 'rel-docs-denied-cooldown',
    gate: 'required',
    group: 'Docs access',
    label: 'A denied access request can only be re-submitted after 24 hours',
    steps: [
      'As Super Admin, deny a test email’s request in /admin/docs-access.',
      'Signed out, submit an access request for that email again. Confirm the generic reply and that /admin/docs-access still shows it as denied (not pending).',
      'If an older denied email (24h+) is available, submit it and confirm it returns to pending. Otherwise note “no 24h-old denial in env”.',
    ],
  },
  {
    id: 'rel-docs-revoke-5s',
    gate: 'required',
    group: 'Docs access',
    label: 'A revoked docs session stops opening pages within about 5 seconds',
    steps: [
      'Sign in to the docs site with an approved test email.',
      'In Partner Hub /admin/docs-access, revoke that email.',
      'Wait about 5 seconds and reload a docs page. Confirm you are sent to /access/ (and a JS file under /assets/ returns 401).',
    ],
  },
  {
    id: 'rel-docs-admin-send',
    gate: 'recommended',
    group: 'Docs access',
    label: 'Admin “send code” still explains no-access and throttled emails',
    steps: [
      'In Partner Hub /admin/docs-access, use send code for an email without access. Confirm it says the email does not have docs access yet.',
      'Send a code to an approved email twice within a minute. Confirm the second attempt says to wait before sending another code.',
    ],
  },
];
