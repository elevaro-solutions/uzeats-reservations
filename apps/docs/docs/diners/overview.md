# Diner overview

The **diner web app** at [tablevera.online](https://tablevera.online) (local: http://localhost:3000) is where guests discover restaurants, book tables, and manage their account.

The **Tablevera** app (`apps/mobile`, Expo) offers the same core flows on the App Store and Google Play. The diner site links to both stores from the downloads page, footer, and a mobile install bar.

The home page shows live totals under the search box: bookable restaurants, cities, diners served, and average rating (refreshed daily; zero totals are hidden).

## What you can do

- **Search** restaurants by city, cuisine, text, or nearby location (list and map views)
- **View** rich restaurant pages — logo, photos, menu, reviews, FAQ, reservation windows, Maps address, and live availability
- **Book** a table with party size, date/time, occasion, and optional packages
- **Pay deposits** when required (Stripe; stubbed locally without keys)
- **Join a waitlist** and get notified when a table opens
- **Save** favorite restaurants at `/saved`
- **Manage reservations** — view upcoming/past visits, edit details, message the restaurant
- **Earn loyalty** — platform and per-restaurant points, tiers, referrals, gift cards (see `/profile/loyalty`)
- **Order online** — takeout and delivery through the restaurant's ordering link, when it has one
- **Leave reviews** after a past visit (manager-completed, or confirmed/seated after the slot ends) with ratings, photos, and a comment
- **Set alerts** for favorite restaurants when near-term availability appears

## Getting an account

Sign up with:

- Email and password (a phone number is required)
- Google OAuth (when configured)
- Phone number + SMS OTP (Twilio in production; dev code `123456` locally)

Creating an account requires signing the **Terms of Use** (typed name or drawn signature). When a new version is published, diners can review, download, and re-sign at `/agreements/sign`.

Password reset is available at `/forgot-password` (3 emails per hour, then a contact-support message).

From **Profile**, diners edit their photo, name, email, phone, address, and password, link or unlink Google, and can permanently **delete the account** (Danger zone). The mobile app links to that web page for deletion.

## Key pages

| Path | Purpose |
|---|---|
| `/` | Home — search and discovery |
| `/restaurants/[slug]` | Restaurant detail and booking |
| `/r/[slug]` | Legacy share link (308 redirect to `/restaurants/[slug]`) |
| `/saved` | Bookmarked restaurants (signed in) |
| `/waitlist` | Your waitlist entries |
| `/profile/loyalty` | Points, tiers, referral code, restaurant rewards, and points history |
| `/billing` | Deposit and payment history |
| `/pricing`, `/for-restaurants` | Restaurant-side marketing and plans |
| `/downloads` | App Store and Google Play links |
| `/login`, `/register` | Authentication |
| `/sms` | SMS opt-in for transactional messages |

## Notifications

Diners can receive updates via:

- Email
- SMS (with explicit opt-in)
- Web push (service worker on the web app)
- In-app notification inbox

Manage channel preferences in account settings after signing in.

## Demo account (local)

`pnpm seed` creates a demo diner with 750 loyalty points. See [Getting started](/developers/getting-started).

## Next steps

- [Discover & book](/diners/discover-and-book)
- [Account & loyalty](/diners/account-and-loyalty)
