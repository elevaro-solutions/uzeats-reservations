# Diner overview

The **diner web app** at [tablevera.online](https://tablevera.online) (local: http://localhost:3000) is where guests discover restaurants, book tables, and manage their account.

A companion **mobile app** (`apps/mobile`, Expo) offers the same core flows on iOS and Android.

## What you can do

- **Search** restaurants by city, cuisine, text, or nearby location (list and map views)
- **View** rich restaurant pages — photos, menu, reviews, FAQ, hours, and live availability
- **Book** a table with party size, date/time, occasion, and optional packages
- **Pay deposits** when required (Stripe; stubbed locally without keys)
- **Join a waitlist** and get notified when a table opens
- **Save** favorite restaurants at `/saved`
- **Manage reservations** — view upcoming/past visits, edit details, message the restaurant
- **Earn loyalty** — platform and per-restaurant points, tiers, referrals, gift cards
- **Leave reviews** after completed visits
- **Set alerts** for favorite restaurants when near-term availability appears

## Getting an account

Sign up with:

- Email and password
- Google OAuth (when configured)
- Phone number + SMS OTP (Twilio in production; dev code `123456`)

Password reset is available at `/forgot-password`.

## Key pages

| Path | Purpose |
|---|---|
| `/` | Home — search and discovery |
| `/restaurants/[slug]` | Restaurant detail and booking |
| `/r/[slug]` | Short share link (rewrites to restaurant page) |
| `/saved` | Bookmarked restaurants (signed in) |
| `/waitlist` | Your waitlist entries |
| `/billing` | Deposit and payment history |
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

| Field | Value |
|---|---|
| Email | `diner@tablevera.local` |
| Password | `Password123!` |
| Loyalty | 750 points pre-seeded |

## Next steps

- [Discover & book](/diners/discover-and-book)
- [Account & loyalty](/diners/account-and-loyalty)
