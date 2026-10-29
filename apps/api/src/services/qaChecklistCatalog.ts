export const QA_CHECKLIST_RELEASE = '0.93.0';

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
    id: 'rel-paid-period-start',
    gate: 'required',
    group: 'Billing',
    label: 'Superadmin can set a restaurant’s paid period start on Package; others cannot',
    steps: [
      'Sign in as Super Admin (not View as / impersonating). Open Admin → a restaurant with a package → Package tab. Confirm a “Paid period start” card with a date picker and Save. The same card is on the restaurants list Edit drawer → Package.',
      'Set a future date and save. Confirm the success toast says trial continues until that date (first charge), and the restaurant stays trialing with trial end / first charge on that day.',
      'Set today (or an earlier date) and save. Confirm the toast says paid period starts on that date, status is paid/active (not trialing), and next renewal is one calendar month later. Ending a trial today may charge Stripe if a card is on file — use a test restaurant.',
      'Sign in as a platform admin or account manager (not Super Admin). Confirm Paid period start is hidden. Open Partner Hub Billing as an owner: period dates are visible but not editable. Super Admin View as that restaurant also hides the form.',
    ],
  },
  {
    id: 'rel-fail-to-pay-ladder',
    gate: 'required',
    group: 'Billing',
    label: 'Unpaid platform invoices follow grace → overdue → unlist → restrict → terminate',
    steps: [
      'Use a disposable test restaurant (day 60 cancels the subscription and remaining upcoming bookings). Admin → Invoices: create a manual invoice with a positive amount. Set due date 8 days ago, save. Open the restaurant Invoices tab: Fail-to-pay stage is overdue, listing still visible, and a finance-charge line (~1.5% of the unpaid total) is on the invoice.',
      'As the owner, open Partner Hub. Confirm an “Invoice overdue” banner (finance charges apply) and Open Billing. The diner listing is still searchable.',
      'Edit the same invoice due date to 14 days ago (or create a new unpaid invoice dated 14 days back) and refresh. Stage is unlisted: diner search/profile hide the restaurant and new online booking is blocked. Partner Hub still opens floor/reservations so staff can honor existing covers. Banner: diner listing is hidden; pay to restore.',
      'Move due date to 30 days ago. Stage is restricted: Grow and other non-ops routes redirect to Billing. Reservations / waitlist / floor-ops stay open for existing covers only — creating a new in-product reservation (including walk-in/phone) is blocked. Banner says Hub is limited to billing and existing reservations.',
      'Do not run day 60 on a real venue. On the disposable restaurant only, due date 60 days ago: stage terminated, subscription cancelled, remaining upcoming bookings cancelled, Hub limited to billing/support. Paying after terminate does not auto-relish — settle the balance, then pick a plan again.',
    ],
  },
  {
    id: 'rel-fail-to-pay-restore',
    gate: 'required',
    group: 'Billing',
    label: 'Partners can pay to restore before terminate; admins can pause, waive, extend grace, or force-restore',
    steps: [
      'On a test restaurant in unlisted or restricted (unpaid invoice, not terminated): as the owner, pay the invoice on Billing (or the public /invoice link). After pay, listing is visible again and Partner Hub routes unlock. Paying one invoice only restores if no other platform debt remains.',
      'Put the restaurant back into unlisted (new unpaid invoice due 14+ days ago). As admin, restaurant Invoices tab: Pause (with a reason) — owner banner says enforcement is paused and the listing does not keep sliding. Resume ladder to continue.',
      'Extend grace until a future date — stage returns to grace and the listing stays visible through that day. Waive fees on the invoice — finance-charge (and declined-fee if present) lines are removed. Force restore — listing is visible and the ladder is paused so the daily job does not immediately unlist again.',
      'Admin → Config: Overdue finance charge defaults to 150 (1.5%/month after 7-day grace); Declined-card fee defaults to $25 once per invoice on the first auto-charge decline. Do not require a live card decline.',
    ],
  },
  {
    id: 'rel-session-preparing',
    gate: 'required',
    group: 'Sign-in',
    label: 'After diner web or Partner Hub sign-in, a preparing screen replaces the blank page and Signed in toast',
    steps: [
      'Sign out of diner web. Sign in with a verified diner. Confirm a full-screen preparing view (illustration, rotating status messages such as “Preparing your table” / “You’re signed in — setting things up…”, and a progress bar). There is no blank white page and no “Signed in” toast. After a moment it lands on the home or next page.',
      'Repeat on Partner Hub /login with an owner (or Super Admin). Confirm “Preparing your restaurant” (or taking you to Partner Hub) with the same illustration + messages + progress — not a spinner on white. It then opens Overview (or Admin).',
      'If the account still needs email verification, confirm the preparing overlay is skipped and you go to verify-email instead.',
    ],
  },
  {
    id: 'rel-plan-switch-full-price',
    gate: 'required',
    group: 'Billing',
    label: 'Switch plan right away charges the full new monthly price and starts a new period',
    steps: [
      'As an owner on a paid plan with a card, open Partner Hub Billing → change plan to a different paid package. Confirm timing options: keep current plan until period end (nothing charged today) vs start the new plan right away.',
      'Select right away. Confirm the amount due today is the full new monthly price (not a leftover-period difference), unused time on the current plan is not credited, and copy says a new billing period starts today. Complete payment if prompted.',
      'After the switch, confirm the current plan is the new one, period start is today, and period end is about one month later. Repeat with period-end timing on another (or the same) restaurant: $0 today, current plan until the existing end date, then the new plan.',
    ],
  },
];
