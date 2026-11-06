export const QA_CHECKLIST_RELEASE = '0.101.1';

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
    id: 'rel-docs-access-redirect',
    gate: 'required',
    group: 'Docs access',
    label: 'Signed-out docs pages go to /access/ and return to the page after the code',
    steps: [
      'In a private window, open a deep docs page (e.g. docs site /admins/billing-and-plans). Confirm you are sent to /access/?next=… and no docs content shows first.',
      'Enter an approved email, request the code, and enter it. Confirm you land back on the page you first opened.',
      'Reload and open other docs pages. Confirm you stay signed in (no second code).',
    ],
  },
  {
    id: 'rel-docs-files-401',
    gate: 'required',
    group: 'Docs access',
    label: 'Docs JS chunks and pages cannot be downloaded without a docs session',
    steps: [
      'While signed in, open DevTools → Network on any docs page and copy the URL of one /assets/js/*.js file.',
      'In a private window (or `curl -I <url>`), open that file. Confirm 401, not the file contents. Open a docs page URL with curl and confirm a 302 to /access/.',
      'Confirm /access/, /img/ images, and /robots.txt still load signed out, and robots.txt says Disallow: /.',
    ],
  },
  {
    id: 'rel-docs-otp-burn',
    gate: 'required',
    group: 'Docs access',
    label: 'A docs code stops working after 5 wrong guesses',
    steps: [
      'On /access/, request a code for an approved email.',
      'Enter a wrong code 5 times. Then enter the correct code and confirm it is rejected.',
      'Request a new code and confirm the new code works.',
    ],
  },
  {
    id: 'rel-docs-revoke',
    gate: 'required',
    group: 'Docs access',
    label: 'Denying docs access in Partner Hub signs the person out of the docs site',
    steps: [
      'Sign in to the docs site with a test email that is approved.',
      'As Super Admin, open Partner Hub /admin/docs-access and deny (revoke) that email.',
      'Within about a minute, reload a docs page in the first window. Confirm it sends you to /access/ instead of showing content.',
    ],
  },
  {
    id: 'rel-docs-no-secrets',
    gate: 'required',
    group: 'Docs content',
    label: 'Docs no longer show demo passwords, seed emails, or the production server address',
    steps: [
      'Signed in, search the docs (and open Getting started, Environment, Deployment, and the QA pages) for “password”, “owner@”, and an IP address.',
      'Confirm no demo seed passwords or seed account emails appear and no production server IP is shown.',
      'Confirm docs responses include the X-Robots-Tag noindex, nofollow header (DevTools → Network → a page response).',
    ],
  },
  {
    id: 'rel-docs-content-refresh',
    gate: 'recommended',
    group: 'Docs content',
    label: 'Docs pages cover v0.85–v0.101 features and point QA at Partner Hub',
    steps: [
      'Skim Admins, Managers, Diners, and Architecture pages. Confirm they mention host and QA roles, All restaurants, Live floor Tables view, Menu editor / Online ordering, default card and failed-charge retries, Pay all, legal agreements, and docs access.',
      'Open the QA overview. Confirm it points to Partner Hub /admin/qa, and the v0.81.0 release page is marked archived.',
    ],
  },
];
