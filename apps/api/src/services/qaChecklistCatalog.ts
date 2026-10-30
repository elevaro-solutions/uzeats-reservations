export const QA_CHECKLIST_RELEASE = '0.94.0';

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
    id: 'rel-plan-billing-duration',
    gate: 'required',
    group: 'Added',
    label: 'Plans & pricing: custom billing duration (days / weeks / months / years)',
    steps: [
      'Sign in as Super Admin. Open Admin → Plans & pricing. Create (or edit) a custom package. Confirm a Billing duration control: a number plus Day / Week / Month / Year. Default on existing built-ins is 1 month. Extra text shows “One paid cycle is …” for the chosen values.',
      'Set duration to 14 days. Confirm the price field label changes from “Monthly price (USD)” to “Price (USD) per 14 days”. Save. The package list shows a /14 days (not /mo) price suffix.',
      'Repeat with 2 weeks, 3 months, and 1 year on disposable packages (or one package edited in turn). Confirm each save sticks and the list suffix matches ( / 2 weeks, / 3 months, / year). Leave at least one 14-day package visible for the next checks.',
    ],
  },
  {
    id: 'rel-manual-invoice-duration',
    gate: 'required',
    group: 'Added',
    label: 'Manual invoices: package duration picker defaults from the selected plan',
    steps: [
      'Admin → Invoices → create a manual invoice. Pick a restaurant, then a standard monthly plan. Confirm Package duration shows 1 + Months (or Annual locks to “Annual billing covers 12 months” and hides the picker).',
      'Switch the plan to the 14-day package from the previous item. Confirm duration defaults to 14 Days and the plan option price uses /14 days (not /mo). Change duration to 2 Weeks, save. Invoice list Duration column shows “2 weeks” (not “2 mo”). Open the invoice: same duration on the detail.',
      'Create another invoice on a 1-year package (or set duration to 1 Year). Confirm Duration shows “1 year”. Existing older invoices that only stored months still show “N months”.',
    ],
  },
  {
    id: 'rel-assign-package-duration',
    gate: 'required',
    group: 'Changed',
    label: 'Assigning or switching a package extends the paid period by that package’s duration',
    steps: [
      'Use a disposable test restaurant. Note today’s date and the current paid-period end on Admin → restaurant → Package (or the restaurants list Edit drawer → Package). Copy says the change extends the billing period by that package’s duration (not “one cycle”).',
      'Assign the 14-day package. Confirm the new period end is about 14 days from the later of today or the previous end — not one month later. Price hint uses /14 days (not /mo).',
      'Then assign a 3-month (or 1-year) package. Confirm the end date moves by 3 calendar months (or 1 year) from the later of today or the current end — not always +1 month. Partner Hub Billing for that restaurant shows the same period dates.',
    ],
  },
  {
    id: 'rel-public-pricing-duration',
    gate: 'required',
    group: 'Changed',
    label: 'Public pricing and Partner Hub pickers show duration; annual applies only to 1-month packages',
    steps: [
      'On diner web /pricing, find the 14-day (or other custom-duration) package. Confirm the price suffix is / 14 days (not / month). Fine print says billed every 14 days (or the matching duration), not month-to-month. Switching Monthly / Annual must not change that custom package’s price to a yearly deal.',
      'A standard 1-month package still shows / month (or annual copy when Annual is selected). Partner Hub register / restaurants plan picker and owner Billing change-plan list use the same duration suffix.',
    ],
  },
  {
    id: 'rel-billing-pay-now-stripe',
    gate: 'required',
    group: 'Fixed',
    label: 'Partner Hub Billing Pay now does not crash Stripe.js on a stub payment secret',
    steps: [
      'As an owner (or Super Admin View as) open Partner Hub Billing on a restaurant that can Pay now (amount due, or start/switch a paid plan so a payment sheet opens).',
      'Open Pay now. Confirm the page does not freeze and the browser console has no Stripe IntegrationError about clientSecret / pi_dev_ / _secret_dev.',
      'If Stripe is configured: a card form appears (or a setup form to collect a card). If the API is in local stub mode: a demo continue path, not a crash. Complete or cancel; Billing still loads afterward.',
    ],
  },
  {
    id: 'rel-antd-console-warnings',
    gate: 'recommended',
    group: 'Fixed',
    label: 'Partner Hub and diner web no longer log Ant Design deprecation console errors',
    steps: [
      'Open Partner Hub Billing with the browser console open. Confirm no warnings for Space `direction`, Alert `message`, Drawer `width`, or static `message.success`.',
      'Open Partner Hub Overview. Confirm no deprecated `List` component warning. Open diner web /pricing (or a restaurant page that uses Space): no Space `direction` warning.',
    ],
  },
];
