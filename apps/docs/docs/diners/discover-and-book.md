# Discover & book

## Finding restaurants

The home page supports multiple discovery modes:

1. **Text search** — restaurant name, cuisine, or keyword
2. **City browse** — curated US cities with SEO landing pages
3. **Near me** — device geolocation (falls back to city picker without permission)
4. **Map view** — toggle with `/?view=map`; requires Google Maps API key
5. **Hub pages** — city, cuisine, occasion, and neighborhood SEO routes

Results show live availability slots when the restaurant has configured shifts and tables.

## Restaurant page

Each restaurant has a detail page with:

- Logo (falls back to the first gallery photo, then initials) and photo gallery
- About, reservation windows (wall-clock ranges, no timezone suffix), and an address that opens Google Maps
- Popular dishes (up to 10 items partners mark in the dashboard; full menu via optional URL)
- Reviews and ratings (overall plus food/service/atmosphere when provided, with diner photos)
- FAQ and terms
- **Order online · Takeout & delivery** — full-width button above Call / Directions / Website / Message when the restaurant has ordering on
- **Book now** — opens the reservation flow
- **Contact** — send an inquiry to the restaurant
- **Save** — bookmark for later (requires sign-in)
- **Explore the dining room in 3D** / **Choose your table in 3D** — when the restaurant offers the Virtual 3D room

Public URL: `https://tablevera.online/restaurants/{slug}` (legacy `/r/{slug}` links redirect here). An inactive restaurant keeps its page but does not accept reservations; a suspended one shows a closed booking card.

## Booking flow

1. Choose **party size**, **date**, and **time** from available slots. Party sizes follow the restaurant's online min and max; above the max, a **Large party** request goes to staff instead
2. Optionally select an **occasion** (birthday, anniversary, business, etc.) and a table (list or 3D, when offered)
3. Add **restaurant packages** (party add-ons configured by the partner)
4. Enter guest details (pre-filled when signed in; a phone is asked for if the profile has none)
5. **Save a card** (card guarantee: charged only for a no-show or late cancel) or **Pay now** (prepaid), if the restaurant requires one
6. Get a 6-digit **confirmation number** and confirmation by email/SMS/push based on your notification prefs

If the booking needs restaurant approval, the button reads **Send request** and the result is **Request sent / Awaiting approval**. A booking that needs a card or payment is not held until the Stripe form is finished; unfinished holds expire after 20 minutes.

Availability is computed from shifts, table capacity, existing reservations, blackouts, holidays, and access rules.

## Waitlist

If no slot is available, join the **waitlist** with a preferred time window. When a cancellation opens a matching slot, you'll be notified and have 15 minutes to book before the next party is offered it. Joining twice for the same restaurant and date shows a warning with a link to your waitlist.

## Favorite availability alerts

Save a restaurant and opt in to **availability alerts** to get notified when a near-term table opens up.

## Widget bookings

Restaurants can embed the Tablevera widget on their own site. Bookings from the widget appear with source `widget` in the partner dashboard.

## Editing or cancelling

Signed-in diners can modify party size, time, or special requests from their reservation detail page, subject to restaurant policy. Cancelling inside the restaurant's cancel window (24 hours by default) can trigger the no-show / late-cancel fee or forfeit a prepayment. Cancelling asks for a reason (preset + optional details) so the restaurant knows why.

Reminder emails include **I'm running late**, which notifies the restaurant. In the mobile app, the 2-hour and 30-minute reminders open an **Are you running late?** prompt.

When the **restaurant** cancels your booking, you receive email/SMS/push that includes their reason (for example Overbooked or Private event) and any custom message they added.

## Tips

- Sign in before booking to earn loyalty points and see reservation history
- Check `/saved` for quick access to favorite spots
- Use `/waitlist` to track active waitlist entries
