# Daily operations

## Reservations

The **Reservations** page is the primary operational view:

- Filter by date, status (confirmed, seated, completed, cancelled, no-show)
- Create **phone** or **walk-in** bookings (`ReservationSource`: `phone`, `walkin`)
- Edit party size, time, table assignment, and internal notes
- Mark guests as **seated**, **completed**, or **no-show** (Confirm is only offered for `pending` bookings; same-status updates are a no-op)
- **Cancel** opens a confirmation modal: pick a required reason (Guest requested, Overbooked, Private event, Restaurant closure, Duplicate booking, or Other) and optionally add a message. The diner’s cancellation email and in-app/SMS copy include that reason; manager alerts do too when a guest cancels
- Share booking links (`/restaurants/{slug}`) with guests
- Search by the guest's 6-digit **confirmation number** (exact match ignores the date filter)

### No-show fees

With the default **card guarantee** deposit policy, the diner saves a card and nothing is charged at booking. Marking a **no-show** (or a diner cancelling inside the cancel window, 24 hours by default) charges the per-guest fee. The reservation detail shows the fee status (card on file, charged, failed, refunded) with **Charge / Retry no-show fee** and **Refund fee**. The automatic no-show job marks bookings but never charges; staff charge from the detail page. Insights → **No-show fees** lists collected fees.

With **prepaid**, the amount is charged at booking and applied to the bill.

### Large party requests

Parties above the restaurant's online maximum can send a request (date, time window, approximate guests, occasion, message, phone). It stays pending with no table held until staff contact the guest.

### Reservation statuses

| Status | Meaning |
|---|---|
| `pending` | Awaiting confirmation (e.g. deposit hold) |
| `confirmed` | Active booking |
| `seated` | Guest arrived and is dining |
| `completed` | Visit finished — loyalty accrues; review prompts also fire for past `confirmed`/`seated` visits |
| `cancelled` | Cancelled by guest or manager |
| `no_show` | Guest did not arrive (may trigger auto-detection via worker) |

## Table layout

Open **Table layout** from **Settings** (or ⌘K). The editor lets you:

- Arrange tables on a canvas
- Rotate and resize tables
- Support multiple dining areas / rooms

Layout state is stored per restaurant and synced via GraphQL.

## Live floor

**Live floor** is the service view. It has four views:

| View | What it shows |
|---|---|
| **Tables** (default) | One tile per table with a chair per seat. Green = Available, amber = Reserved, red = Seated, blue = Turning. Busy tiles show the guest, party, and time or turn time left; free tiles show the next booking ("Next 7:30 PM · Party 4") |
| **Floor plan** | The published table layout with live status |
| **List** | Tables and status as a list |
| **3D** | The Virtual Room with live colors (hosts can view it without the add-on) |

Drag an arriving guest onto a tile to seat them; tables that fit the party are outlined while dragging. Click a tile to open the **table drawer**:

- The current guest with **Seat here** / **Complete**, plus **No-show**, **Refund deposit**, and **Cancel**
- On a free table, arriving guests with **Seat here** (parties too big are greyed out)
- **Upcoming today** for that table, with **Seat now** for early arrivals
- ⋯ menu: **Edit table** and **Open in table layout** (hidden for hosts)

Tables & shifts opens a table's edit form when linked with `?editTable=<id>`.

## Waitlist

When fully booked:

1. Add guests to the waitlist with party size and contact info
2. System ranks by join time and preferences
3. On cancellation, eligible parties are **notified** (SMS, email, push per prefs)
4. Convert notified entries to confirmed reservations

## Guest messaging

**Messages** provides reservation-scoped threads:

- Reply to diner inquiries from the restaurant page
- Proactive messages (e.g. running late, special prep)
- Managers receive **new message** notifications per channel prefs

## Guest CRM

**Guests** lists past diners for the selected restaurant: VIP status, tags, visits, loyalty points, and spend. Open a row to edit notes, tags, dietary needs, and preferred table.

Export the current restaurant, search, and VIP filter as Excel or PDF from the page header. Platform admins can also download every restaurant's guest profiles from **Admin → Platform → Data exports**.

## Walk-in and phone bookings

Owners and managers can book without a diner account:

- Capture guest name and phone
- Select table and time manually
- Source is recorded as `phone` or `walkin` for reporting

## Blackouts & access rules

Under **Settings**:

- **Blackouts** — block dates/times ( holidays, private events)
- **Access rules** — restrict online booking by party size, lead time, or membership

## Menu management

The **Menu** editor holds categories and dishes. Dish rows show a photo thumbnail, price, a one-line description, dietary tags, and an **Unavailable** tag.

- **Search** by name, description, or dietary tag, and filter to **Popular** or **Unavailable**
- Move dishes and categories up or down; **Expand all / Collapse all** per category
- Star up to 10 dishes as **Popular** (the **Featured dishes** meter shows x / 10). Those are the only dishes diners see on the public restaurant page and in the mobile menu tab
- An **Unsaved changes** bar offers **Discard** and **Save menu**, and the page warns before you leave or switch restaurants with unsaved edits
- Save checks every dish and jumps to the first one that needs a name or price

Link a **Full menu URL** if you want guests to open the complete menu. Clearing the field removes the link. Partners can also **import** menu data from DoorDash/Uber Eats MHTML exports.

### Online ordering

The **Online ordering** card takes a DoorDash, Uber Eats, Toast, or other ordering link. When it is on, the diner page shows a full-width **Order online · Takeout & delivery** button. Owners, managers, and admins can switch the button off without deleting the link; hosts cannot. Adding a valid link turns it on.

The diner button adds `utm_source=<site>/restaurants/<slug>`, `utm_medium=reservations`, and `utm_campaign=order_online` so the ordering platform's analytics can attribute Tablevera orders. Copy the tracked link from the card.

## Operational notifications

Configure which events ping you and on which channels:

- New reservation
- Guest spend alerts
- Waitlist conversion
- New messages and new reviews
- Survey invitations

Settings → **Notifications**. The **Messenger bot** card links a Telegram chat (up to 3 per user per restaurant) for actionable reservation cards: Accept, Reject, Seat, Complete, No-show, and Cancel. Times on those cards use the restaurant's timezone.

Billing alerts (failed card charges, expiring card, trial without a card) always go by email and in-app, even if account-update notifications are off.

## End of service

After marking reservations **completed**:

- Loyalty points accrue for signed-in diners
- Post-visit review prompt is sent (diners can also review a past confirmed/seated visit if managers never marked completed)
- Reports update for the service period

## Reviews

The **Reviews** page (sidebar under Guests) lists diner ratings (overall plus food/service/atmosphere), comments, and photos. Unreplied reviews show as a count badge on the sider. Creating a review notifies owners and managers (`new_review`; toggle under Settings → Notifications → **New review**).

- **Reply** posts a public owner/manager response (`replyToReview`)
- **Generate draft** fills a personalized reply (`generateReviewReplyDraft`) using Gemini when `GEMINI_API_KEY` is set, otherwise a template
- **Report** queues a policy-violation report for Tablevera (`reportReview`). The review stays public until an admin hides or dismisses it. Disagreeing with a rating is not a valid reason — reply instead.
- **Add to gallery** appends selected diner photos to the restaurant gallery (up to 10 total; hero order is still set in Settings)

Managers with venue access can reply and report the same as owners. Drafts are not posted until you submit the reply. Only platform admins can hide reviews.

## Shareable links

Copy a direct booking link from **Booking widget** / **Restaurant profile** → Booking widget, or build URLs:

```
https://tablevera.online/restaurants/{restaurant-slug}
```

For **Google Business Profile** (Profile Manager → Bookings), copy the **Google Business Profile link** from the same panel. It appends UTM tags (`utm_source=google`, `utm_medium=business_profile`, `utm_campaign=reservations`) so analytics can attribute listing traffic.

The **website embed** widget adds its own UTMs (`utm_source=widget`, `utm_medium=embed`, `utm_campaign=reservations`) when diners continue to Tablevera — no extra setup.

Toggle **accept online reservations** and **hide widget** in restaurant settings when needed.

## Photos

On **Public profile**, upload a **logo** and up to 10 venue photos, then request review. Drag to reorder (or use the arrows / star). The first photo is the large hero on the diner restaurant page; the next two appear beside it; remaining photos show in the gallery below. Changes go live after a Tablevera admin approves them. **Settings** can still save listing photos immediately. Diner review photos can be added to the gallery from **Reviews**.

## Getting help

**Support** in the sidebar opens a ticket with Tablevera (`createOwnerSupportTicket`). Format the details and attach screenshots when they help. Attach the restaurant when the issue is location-specific. Open a ticket to continue the chat with Tablevera. Platform admins work the queue at **Admin → Tickets**.
