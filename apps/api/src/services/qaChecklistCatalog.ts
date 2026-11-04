export const QA_CHECKLIST_RELEASE = '0.100.0';

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
    id: 'rel-admin-agreements-editor',
    gate: 'required',
    group: 'Agreements',
    label: 'Super Admin edits Terms of Use and Partner Agreement and publishes a new version',
    steps: [
      'As Super Admin, open Platform → Content → Agreements (/admin/agreements). Confirm Terms of Use and Restaurant Partner Agreement both load with default content.',
      'Edit the Partner Agreement (use a disposable env), save, and confirm a new version number is published.',
      'Click Preview signing page. Confirm the owner signing page opens in preview mode with the signature pad visible and signing disabled.',
    ],
  },
  {
    id: 'rel-signup-agreement-signature',
    gate: 'required',
    group: 'Agreements',
    label: 'Diner and partner signup require a typed or drawn signature',
    steps: [
      'On diner web Create account, confirm Terms of Use must be signed (type full legal name or draw) before the account is created. Try submitting without a signature and confirm it is blocked.',
      'On Partner Hub /register Confirm step, confirm the Partner Agreement must be signed the same way before the account is created.',
      'On either step, download the agreement PDF. Confirm an A4 branded PDF (Tablevera logo, forest and gold).',
    ],
  },
  {
    id: 'rel-agreement-resign-window',
    gate: 'required',
    group: 'Agreements',
    label: 'New Partner Agreement version gives owners 7 days, then locks Partner Hub to signing',
    steps: [
      'After publishing a new Partner Agreement version, sign in as a restaurant owner. Confirm a banner shows the days left and links to /agreements/sign.',
      'Sign there (typed or drawn). Confirm the page stays open with Download signed copy ready (it does not jump to Overview), and the banner is gone.',
      'If you can backdate or use a venue past the 7-day window, confirm Partner Hub sends the owner to the signing page until they sign. Otherwise note “window not reachable in env”.',
    ],
  },
  {
    id: 'rel-signed-copy-pdf',
    gate: 'required',
    group: 'Agreements',
    label: 'Download signed copy shows signature, signer details, and the exact signed version',
    steps: [
      'On the owner Partner Agreement page (Settings → Account → Agreements, or /agreements/sign), click Download signed copy.',
      'Confirm the PDF has the signature (drawn image or typed name in script), signer name, email, UTC date/time, agreement version, signing method, IP, and device.',
      'Publish a newer version, then download the older signed copy again. Confirm it still shows the text of the version that was signed. Repeat once on diner web /agreements/sign for Terms of Use.',
    ],
  },
  {
    id: 'rel-agreement-legacy-owner-setup',
    gate: 'required',
    group: 'Agreements',
    label: 'Owners without a signature see Please sign and a Go live setup step',
    steps: [
      'Sign in as an owner created before signing existed (no Partner Agreement signature). Confirm a Please sign banner appears but Partner Hub is not locked.',
      'Open the setup guide → Go live. Confirm a required Sign the Partner Agreement step (owners only) that completes after signing.',
      'Sign in as a manager or host on that venue. Confirm they do not get the owner signing step or the Agreements card.',
    ],
  },
  {
    id: 'rel-agreement-reminder-email',
    gate: 'recommended',
    group: 'Agreements',
    label: 'Reminder email goes out 1–2 days before the 7-day window ends',
    steps: [
      'In an env with email delivery (or the email log), find an owner with a pending re-sign 1–2 days before the deadline.',
      'Confirm the branded reminder shows days remaining, a signing link, and a PDF download link, and both links work.',
      'Skip if the reminder job cannot be triggered here; note “not triggerable in env”.',
    ],
  },
  {
    id: 'rel-pay-all-unpaid',
    gate: 'required',
    group: 'Billing',
    label: 'Pay all settles every open invoice in one charge; /billing/unpaid lists them',
    steps: [
      'Use a test restaurant with 2+ unpaid platform invoices. Open Partner Hub Billing. Confirm one banner with an “N unpaid invoices” link and Pay all.',
      'Open the link. Confirm /billing/unpaid lists every open invoice with the total.',
      'Click Pay all and pay with a test card. Confirm one Stripe charge and every listed invoice turns Paid. If Stripe is stubbed, note “stubbed”.',
    ],
  },
  {
    id: 'rel-featured-pricing-toggle',
    gate: 'required',
    group: 'Billing',
    label: 'Featured / popular package switch controls the highlighted card on /pricing',
    steps: [
      'As Super Admin, open Admin → Pricing. Turn on Featured / popular for a package other than Core and save.',
      'Open diner web /pricing. Confirm that package is highlighted and Core is not.',
      'Turn Featured on for a second package. Confirm the first one turns off (only one featured at a time).',
    ],
  },
  {
    id: 'rel-menu-profile-editor-stable',
    gate: 'required',
    group: 'Partner Hub',
    label: 'Menu and Restaurant profile keep expanded dishes, uploads, and unsaved photos during background refresh',
    steps: [
      'Open /menu. Confirm a loading spinner while locations and dishes load. Expand two dishes and start a dish photo upload, then wait 90 seconds without clicking.',
      'Confirm the dishes stay expanded, the upload finishes, and the form is not reset. Change Menu URL, Save, and confirm no BAD_USER_INPUT error.',
      'Open /restaurant-profile → Photos. Upload or reorder photos without saving, wait 90 seconds, and confirm the changes are still there. Save and confirm they persist.',
    ],
  },
  {
    id: 'rel-platform-hub-qa-nav',
    gate: 'required',
    group: 'Partner Hub',
    label: 'Platform hub is grouped, and Super Admin finds QA under Platform',
    steps: [
      'As Super Admin, open /admin/platform. Confirm cards are grouped as Setup, Configuration, Content, Email, Monitoring, QA, and Advanced, and the filter narrows them.',
      'Confirm the sidebar has no top-level QA group for Super Admin; QA dashboard, checklist, history, issues, versions, and guide open from Platform → QA.',
      'Sign in as a QA-role user. Confirm the dedicated QA menu is still there.',
    ],
  },
  {
    id: 'rel-diner-reviews-fee-cards',
    gate: 'required',
    group: 'Diner web',
    label: 'Review counts match published reviews; no-show fee only accepts cards',
    steps: [
      'Open a diner restaurant page with a few reviews. Confirm “Showing X of N”, Show all N reviews, and the rating summary use the published review count (“1 review” singular).',
      'Book a restaurant that requires a no-show / late-cancel card. Confirm the card step offers cards (and Apple Pay / Google Pay where available) but not methods like BLIK.',
      'While impersonating a diner from Partner Hub, confirm Exit impersonation is readable (white button on the green bar).',
    ],
  },
  {
    id: 'rel-admin-cuisines-all',
    gate: 'recommended',
    group: 'Partner Hub',
    label: 'Admin restaurant views show every selected cuisine',
    steps: [
      'As Super Admin, pick a restaurant with 2+ cuisines.',
      'Confirm the Restaurants table, restaurant detail header, and Overview show all cuisines, not only the first.',
    ],
  },
];
