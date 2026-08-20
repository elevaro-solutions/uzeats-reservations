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

- Photo gallery and hero image
- About, hours, address (Google Places autocomplete when configured)
- Menu sections
- Reviews and ratings
- FAQ and terms
- **Book now** — opens the reservation flow
- **Contact** — send an inquiry to the restaurant
- **Save** — bookmark for later (requires sign-in)

Short links: `https://tablevera.online/r/{slug}`

## Booking flow

1. Choose **party size**, **date**, and **time** from available slots
2. Optionally select an **occasion** (birthday, anniversary, business, etc.)
3. Add **restaurant packages** (party add-ons configured by the partner)
4. Enter guest details (pre-filled when signed in)
5. Pay a **deposit** if the restaurant requires one
6. Receive confirmation via email/SMS/push based on your notification prefs

Availability is computed from shifts, table capacity, existing reservations, blackouts, and access rules.

## Waitlist

If no slot is available, join the **waitlist**. When a cancellation opens a matching slot, you'll be notified and can convert to a confirmed booking.

## Favorite availability alerts

Save a restaurant and opt in to **availability alerts** to get notified when a near-term table opens up.

## Widget bookings

Restaurants can embed the Tablevera widget on their own site. Bookings from the widget appear with source `widget` in the partner dashboard.

## Editing or cancelling

Signed-in diners can modify party size, time, or special requests from their reservation detail page, subject to restaurant policy. Cancellation may forfeit deposits per restaurant terms.

## Tips

- Sign in before booking to earn loyalty points and see reservation history
- Check `/saved` for quick access to favorite spots
- Use `/waitlist` to track active waitlist entries
