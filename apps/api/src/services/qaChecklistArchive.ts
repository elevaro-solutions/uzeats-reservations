import type { QaChecklistCatalogItem } from './qaChecklistCatalog.js';

/**
 * Catalogs of releases that are no longer the live gate. When a new release replaces
 * `QA_CHECKLIST_CATALOG`, move the outgoing catalog here so its run can still be created
 * (on API start) if nobody opened `/admin/qa` while it was current.
 */
export const QA_CHECKLIST_ARCHIVE: Record<string, QaChecklistCatalogItem[]> = {
  '0.104.0': [
    {
      id: 'rel-map-clusters',
      gate: 'required',
      group: 'Diner web map',
      label: 'Map groups overlapping restaurants into a numbered bubble; tapping it zooms in or lists venues',
      steps: [
        'On diner web, open search and switch to the Map view. Zoom out until several restaurants overlap. Confirm they collapse into one bubble showing a count.',
        'Click the bubble. Confirm the map glides to it and zooms in smoothly, one level at a time, until the restaurants separate into individual markers.',
        'Find (or seed) two restaurants at the same address. Click their bubble and confirm a “restaurants here” list opens instead of zooming forever; pick one and confirm its card opens.',
        'At a mid zoom where name labels would overlap, confirm overlapping labels are hidden but the pin itself is still clickable.',
      ],
    },
    {
      id: 'rel-map-marker-chips',
      gate: 'required',
      group: 'Diner web map',
      label: 'Map markers are white chips (dot + name); selected marker is a larger gold dot with a halo',
      steps: [
        'On the Map view, confirm each restaurant shows as one white chip containing its dot and name.',
        'Hover a chip. Confirm its shadow deepens smoothly and the dot pops with a soft ring.',
        'Click a chip. Confirm the selected restaurant shows a larger gold dot with a soft halo and its name label hides while the card is open; closing the card brings the label back.',
      ],
    },
    {
      id: 'rel-map-card-polish',
      gate: 'required',
      group: 'Diner web map',
      label: 'Map restaurant card: tail lands above the dot, fades in, lighter slots, hover photo arrows, focus states',
      steps: [
        'Click a restaurant on the map. Confirm the card fades in and its pointer tail joins the card seamlessly and lands just above the selected dot.',
        'On a restaurant with 2+ photos, confirm the photo arrows appear on hover (desktop) and are always visible on a touch device / mobile emulation.',
        'Confirm the time-slot buttons look lighter than before and every button (close, arrows, slots) shows a hover state and a visible focus ring when tabbing with the keyboard.',
      ],
    },
    {
      id: 'rel-map-card-edges',
      gate: 'required',
      group: 'Diner web map',
      label: 'Map card and “restaurants here” list stay inside the map near its edges',
      steps: [
        'Pan so a marker sits near the top edge of the map and click it. Confirm the card flips below the marker instead of being cut off.',
        'Repeat with markers near the left and right edges. Confirm the card shifts sideways and stays fully inside the map.',
        'Make the browser window short, then select a restaurant low on the map. Confirm the map pans so the card fits above the marker.',
        'Repeat the top-edge check with a same-spot bubble and confirm the “restaurants here” list also stays inside the map.',
      ],
    },
    {
      id: 'rel-map-sync-after-filter',
      gate: 'required',
      group: 'Diner web map',
      label: 'Map labels and positions stay in sync after the result list changes',
      steps: [
        'On the Map view, change filters (e.g. cuisine, price, or search text) a few times so the result list changes.',
        'Confirm each marker label matches the restaurant at that position and no stale labels or bubbles are left behind from the previous results.',
      ],
    },
    {
      id: 'rel-map-short-window',
      gate: 'required',
      group: 'Diner web map',
      label: 'Map page on a short desktop window: map is not clipped; filters scroll inside their panel',
      steps: [
        'On desktop, resize the browser to a short height (around 600–700px) and open the Map view.',
        'Confirm the bottom of the map is visible and the page does not grow taller than the screen.',
        'Scroll inside the filters sidebar and confirm it scrolls within its own panel.',
      ],
    },
    {
      id: 'rel-redeem-empty-inputs',
      gate: 'required',
      group: 'Diner booking',
      label: 'Redeem points inputs start empty (no leading 0)',
      steps: [
        'Sign in as a diner with loyalty points and start a booking on a restaurant that takes a deposit.',
        'Confirm the “Redeem loyalty points” input (and the restaurant points input, if shown) is empty with a “Min …” placeholder, not 0.',
        'Type 1432. Confirm the value reads 1432, not 01432.',
      ],
    },
    {
      id: 'rel-redeem-validation',
      gate: 'required',
      group: 'Diner booking',
      label: 'Redeem points shows the real validation message and blocks booking until valid',
      steps: [
        'On the same booking, enter fewer points than the minimum. Confirm the message says “Minimum redeem is … points”.',
        'Enter more points than your balance. Confirm the message says “Insufficient loyalty points” (not “Minimum 500 points”) and booking cannot proceed.',
        'On a small deposit, enter a large valid amount. Confirm it shows the capped amount actually redeemed, or “Deposit is too small to redeem …” when even the minimum does not fit.',
        'Enter a valid amount. Confirm the success message shows the discount and the confirm step lists the same points redeemed.',
      ],
    },
  ],
  '0.103.2': [
    {
      id: 'rel-qa-history-missed-run',
      gate: 'required',
      group: 'QA Hub',
      label: 'QA History lists v0.103.0 and every release since, even ones nobody opened',
      steps: [
        'Open Partner Hub /admin/qa/history. Confirm v0.103.2 (Current), v0.103.1, v0.103.0, and v0.102.0 are all listed.',
        'Select v0.103.0. Confirm it has 7 tasks (Surveys, Exports, Booking, Partner Hub) at 0/6 required, and Open checklist shows them.',
        'Select v0.103.1. Confirm its progress and notes from before this deploy are unchanged (the agreement checkbox task).',
      ],
    },
    {
      id: 'rel-qa-current-run-on-deploy',
      gate: 'required',
      group: 'QA Hub',
      label: 'The current release appears on QA Dashboard and History right after deploy',
      steps: [
        'Before opening the checklist page, open /admin/qa/dashboard. Confirm the current gate shows v0.103.2.',
        'Open /admin/qa/history and confirm v0.103.2 is listed without having visited /admin/qa first.',
      ],
    },
  ],
  '0.103.1': [
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
  ],
  '0.103.0': [
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
  ],
};
