import type { QaChecklistCatalogItem } from './qaChecklistCatalog.js';

/**
 * Catalogs of releases that are no longer the live gate. When a new release replaces
 * `QA_CHECKLIST_CATALOG`, move the outgoing catalog here so its run can still be created
 * (on API start) if nobody opened `/admin/qa` while it was current.
 */
export const QA_CHECKLIST_ARCHIVE: Record<string, QaChecklistCatalogItem[]> = {
  '0.106.0': [
    {
      id: 'rel-menu-add-dish-collapsed',
      gate: 'required',
      group: 'Partner Hub menu',
      label: 'Adding a dish saves even when other dishes were never expanded (QA row 29)',
      steps: [
        'As an owner, open Partner Hub → Menu. Pick a category with 2+ dishes and do NOT expand any of them.',
        'Click Add dish, fill name and price, and click Save menu. Confirm “Menu saved” and no “Dish 1 … needs a name” or “reading ‘trim’” error.',
        'Reload the page. Confirm the new dish and every existing dish in every category are still there.',
        'As Admin, open Admin → Restaurants → (restaurant) → Menu, save without expanding any dish, reload, and confirm no dishes disappeared.',
      ],
    },
    {
      id: 'rel-billing-readable-errors',
      gate: 'required',
      group: 'Partner Hub billing',
      label: 'Start trial and plan upgrade show a readable reason instead of “Internal server error” (rows 16, 19)',
      steps: [
        'On Partner Hub → Billing for a restaurant with no subscription, click Start 30-day trial. Confirm it starts, or shows a specific reason (not “Internal server error”).',
        'On a restaurant with an active plan, upgrade to a higher plan. Confirm the upgrade completes (or opens payment), or shows a specific reason.',
        'Switch to a restaurant you do not own (or use a stale ?restaurant= id) and retry. Confirm the message is “Forbidden” or “Restaurant not found”.',
      ],
    },
    {
      id: 'rel-floor-duplicate-fixture-bounds',
      gate: 'required',
      group: 'Partner Hub floor plan',
      label: 'Duplicated tables and new fixtures land inside the visible canvas (rows 24, 34)',
      steps: [
        'Open Partner Hub → Floor plan. Select a table and click Duplicate. Confirm the copy appears right next to it (below or beside) with a small gap, inside the canvas.',
        'Duplicate a table near the right and bottom edges. Confirm the copy still stays inside the canvas; on a full canvas confirm “No room on the canvas” appears.',
        'Add each fixture type (bar, kitchen, wall, window…). Confirm each appears inside the canvas, not below or to the right of the grid.',
      ],
    },
    {
      id: 'rel-floor-rotated-overlap-bounds',
      gate: 'required',
      group: 'Partner Hub floor plan',
      label: 'Rotated tables: overlaps are flagged and they cannot leave the canvas (row 32)',
      steps: [
        'Rotate two tables (R key or the rotate handle) and drag one onto the other. Confirm both get a red outline, the toolbar shows “N overlapping”, and Publish is blocked.',
        'Drag a table onto a bar or wall fixture. Confirm it is flagged as overlapping too (a door or window on a wall is not flagged).',
        'Turn a long table 90° and drag it to each edge. Confirm no part goes past the canvas. Rotate a table sitting at an edge and confirm it moves back inside.',
      ],
    },
    {
      id: 'rel-floor-save-errors',
      gate: 'required',
      group: 'Partner Hub floor plan',
      label: 'Save draft and Publish show what to fix instead of a raw server error (row 25)',
      steps: [
        'Make a change and click Save draft. Confirm “Draft saved”.',
        'Clear a fixture name, then Save draft. Confirm it saves (the name falls back to the fixture type) with no raw error.',
        'If any save fails, confirm the message names the problem (e.g. which table) rather than a technical error.',
      ],
    },
    {
      id: 'rel-virtual-room-square',
      gate: 'required',
      group: 'Virtual 3D room',
      label: 'Tables a few degrees off square render straight in 3D; rotation snaps to right angles (row 31)',
      steps: [
        'On the floor plan, drag the rotate handle slowly near 0°/90°. Confirm it snaps onto the right angle within a few degrees; hold Shift to step by 15°.',
        'Open Partner Hub → Virtual 3D room. Confirm tables look evenly aligned (not slightly crooked) and newly placed tables do not overlap their neighbours’ chairs.',
      ],
    },
    {
      id: 'rel-promo-create-validation',
      gate: 'required',
      group: 'Partner Hub marketing',
      label: 'New promotion explains bad input next to the field instead of “Internal server error” (row 26)',
      steps: [
        'Open Partner Hub → Marketing → Promotions → New promotion.',
        'Fill both Discount % and fixed amount. Confirm the form says to use one or the other.',
        'Set an end date before the start date, and a code with a space. Confirm each shows an error under its field.',
        'Use a code another promotion at this restaurant already uses. Confirm “Code … is already used by …” appears under Promo code.',
        'Fill valid values and save. Confirm “Promotion created”.',
      ],
    },
    {
      id: 'rel-promo-weekdays-and-clear',
      gate: 'required',
      group: 'Partner Hub marketing',
      label: 'Promo weekday limits are enforced; clearing Max redemptions removes the limit (rows 27, 28)',
      steps: [
        'Create a promotion with a code limited to one weekday. On diner web, book a time on a different weekday with that code. Confirm it is rejected with “not valid on this day of the week”.',
        'Book on the allowed weekday with the code, then try to move the booking to another weekday. Confirm the move is blocked with an explanation.',
        'Edit a promotion that has Max redemptions set, clear the field, and save. Reopen it and confirm Max redemptions is empty and the table shows no limit.',
      ],
    },
    {
      id: 'rel-widget-promo',
      gate: 'required',
      group: 'Booking widget',
      label: 'Booking widget checks the promo code and passes time + valid code to Tablevera (row 30)',
      steps: [
        'Embed the widget from Partner Hub → Booking widget on a restaurant that takes a deposit.',
        'Pick a time, then type an active code. Confirm “Code applied: $… off your deposit”. Type an inactive or wrong-day code and confirm the reason is shown.',
        'With a valid code, click Complete reservation. Confirm Tablevera opens with the same date, party, time, and promo code already filled.',
      ],
    },
    {
      id: 'rel-reservations-integrations',
      gate: 'required',
      group: 'Partner Hub',
      label: 'Reservations “All dates” lists bookings; creating an integration partner works (rows 23, 35)',
      steps: [
        'Open Partner Hub → Reservations. With Today showing a booking, switch to All dates. Confirm the list shows that booking and older ones (no empty table).',
        'Open Partner Hub → Integrations with a restaurant selected. Click New integration, fill name and provider, and create. Confirm the API key dialog appears.',
        'Switch to All restaurants. Confirm New integration is disabled.',
      ],
    },
    {
      id: 'rel-ui-composer-hub-cards',
      gate: 'recommended',
      group: 'Partner Hub UI',
      label: 'Message box corners match the Send button; hub cards are equal height (rows 2, 6)',
      steps: [
        'Open Partner Hub → Messages on a conversation. Confirm the message box and Send button read as one control with matching outer corners and the same height.',
        'Open Partner Hub → Grow (and Settings, Insights). Confirm cards in each row are the same height and long descriptions are cut to two lines.',
      ],
    },
  ],
  '0.105.0': [
    {
      id: 'rel-profile-change-review',
      gate: 'required',
      group: 'Profile requests',
      label: 'Live restaurant name, cuisine, description, price, photos, logo, contact, and address go to review',
      steps: [
        'Sign in as the owner (or manager) of an approved, live restaurant. In Restaurant profile, change the name and description, add a photo, and change the phone or address. Save.',
        'Confirm Partner Hub says the changes were sent for review, and the diner restaurant page still shows the old name, description, photos, and contact.',
        'Change a booking setting (e.g. party size or deposit) and save. Confirm it applies right away without review.',
        'Save the Menu page without touching the listing. Confirm the pending name / description request is still pending (not wiped).',
      ],
    },
    {
      id: 'rel-profile-request-approve-deny',
      gate: 'required',
      group: 'Profile requests',
      label: 'Admin approves or denies the queued profile change in Profile requests',
      steps: [
        'As Super Admin, open Partner Hub → Profile requests. Confirm the request from the previous task lists each changed field with old and new values.',
        'Approve it. Confirm the diner restaurant page now shows the new name, description, photos, and contact.',
        'Submit another change as the owner, then deny it. Confirm the live listing is unchanged and the owner can edit again.',
      ],
    },
    {
      id: 'rel-images-cdn',
      gate: 'required',
      group: 'Images',
      label: 'Restaurant, menu, review, profile, blog, and floor images load from the Spaces CDN',
      steps: [
        'On diner web, open a restaurant page, a search / map card, Saved, and a blog post. In DevTools → Network → Img, confirm uploaded photos load from a *.cdn.digitaloceanspaces.com URL (not *.digitaloceanspaces.com and not /_next/image).',
        'Confirm the photos actually display (no broken images) on the restaurant gallery, map card, discovery cards, and blog cover / inline images.',
        'In Partner Hub, open Restaurant profile photos, Menu dish photos, and the floor plan background. Confirm they display and load from the CDN.',
        'Upload a new photo in Partner Hub and confirm it shows right away.',
      ],
    },
    {
      id: 'rel-telegram-link-before-start',
      gate: 'required',
      group: 'Telegram bot',
      label: 'Linking a Telegram chat before Start shows steps and a bot link, not Internal server error',
      steps: [
        'In Partner Hub → Notifications → Telegram messenger bot, open Link Telegram chat ID. Enter the numeric chat ID of a Telegram account that has never opened the bot, and submit.',
        'Confirm the modal shows the steps (open the bot, tap Start or send /start, copy the chat ID, paste again) with a clickable bot link, not Internal server error.',
        'From that account, open the bot and send /start before linking. Confirm the reply includes the numeric chat ID. Paste it in Partner Hub and confirm the link succeeds.',
      ],
    },
    {
      id: 'rel-admin-exports-moved',
      gate: 'recommended',
      group: 'Admin',
      label: 'Admin Data exports live under Platform → Configuration',
      steps: [
        'As Super Admin, open Platform. Confirm Data exports is a card under Configuration and is no longer under Billing.',
        'Open it and confirm /admin/exports still loads and downloads an export.',
      ],
    },
  ],
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
