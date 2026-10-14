# Tablevera store listings

Copy-paste kit for App Store Connect and Google Play Console. Brand voice matches the website: **Discover. Reserve. Dine.** Forest `#0B3D2E`, gold `#C5A059`, cream `#FAF6EE`.

Generated assets live in [`docs/store/assets/`](./store/assets/). Recreate with `node docs/store/generate-assets.mjs`.

## Apps

| | Diner | Partner |
| --- | --- | --- |
| Binary name | Tablevera | Tablevera Merchant |
| **Store name** | Tablevera | Tablevera Partner |
| Bundle / package | `uz.alitech.tablevera` | `uz.alitech.tablevera.merchant` |
| EAS project | `@xondamir/tablevera` | `@xondamir/tablevera-merchant` |
| Version | 1.0.0 | 1.0.0 |
| Scheme | `tablevera` | `tablevera-merchant` |
| Orientation | Portrait | Portrait |
| Tablet | Yes — iPad screenshots required | Yes — iPad screenshots required |

Use **Tablevera Partner** on both stores (not “Merchant”). It matches Partner Hub and reads clearly at 17–18 characters. Keep the binary display name as-is until you rename `apps/merchant-mobile/app.config.js`.

---

## Screenshot template

**Use set 13299–13288** (sage / mint frames, dark green footer, “FEATURED” style).

Recolor to Forest & Gold:

| Token | Hex |
| --- | --- |
| Frame background | `#F5F4F0` or `#FAF6EE` |
| Footer / accent bar | `#0B3D2E` |
| Headline | `#0B3D2E` |
| Supporting line | `#7A7468` |
| Hairline / dot | `#C5A059` |

Do **not** use: holographic 12999–13004, electric blue 12822–12988, black 12555–12600, pastel 13366–13440, isolated phones 13111–13116.

Why 13299: it is the only set that already feels hospitality (sage + deep green), leaves room for a short headline, and will not fight restaurant photography inside the device.

### Capture sizes

| Store | Required | Size | Count |
| --- | --- | --- | --- |
| App Store iPhone | 6.9-inch (Dynamic Island large) | **1320 × 2868** portrait (also accepts 1290 × 2796 or 1260 × 2736) | 6 framed shots |
| App Store iPad | 13-inch (both apps set `supportsTablet: true`) | **2064 × 2752** or 2048 × 2732 | Same 6 screens |
| Google Play phone | 9:16 or 16:9 | **1080 × 1920** or 1080 × 2340 | Same 6 screens (2–8 allowed) |
| Play feature graphic | Required | **1024 × 500**, JPEG or 24-bit PNG, no alpha | See `docs/store/assets/` |
| Play icon | Required | **512 × 512**, 32-bit PNG | See `docs/store/assets/` |
| App Store icon | Required | **1024 × 1024**, PNG, **no alpha** | See `docs/store/assets/` |

Do not upload `.tmp/` QA shots. They show empty books, skeletons, and debug chrome.

### Diner shot list + captions

| # | Screen | Headline | Supporting |
| --- | --- | --- | --- |
| 1 | Home (city set, popular cards filled) | Find a table for tonight | Live restaurants near you |
| 2 | Restaurant profile (hero + Book) | See the room before you book | Photos, menu, and reviews |
| 3 | Booking slots (party + time chips) | Reserve in seconds | Real times, not a request form |
| 4 | Confirmation or upcoming detail | Your night, in one place | Reminders, messages, calendar |
| 5 | Reservations list (upcoming filled) | Change plans without a call | Edit, cancel, or say you’re late |
| 6 | Profile loyalty / favorites | Come back as a regular | Points, saved places, alerts |

### Partner shot list + captions

| # | Screen | Headline | Supporting |
| --- | --- | --- | --- |
| 1 | Overview (non-zero covers / bookings) | Tonight’s book at a glance | Covers, waitlist, messages |
| 2 | Reservations → Today (real rows) | The book in your pocket | Today, upcoming, and past |
| 3 | Floor with mixed table states | Seat the room from the floor | Available, reserved, seated, turning |
| 4 | Reservation detail / seat actions | Confirm, seat, complete | Walk-ins and phone bookings too |
| 5 | Waitlist Live (a few names) | Fill the gaps | Notify the next guest, then seat |
| 6 | Messages thread | Guests without the phone tag | Reminders and two-way chat |

Capture on a production or preview build against `https://api.tablevera.online/graphql` with seeded-looking data (named guests, real venue photos, no `*.local` emails on screen). Hide the Android debug overlay. Prefer a physical iPhone 16 Pro Max / 15 Pro Max for 6.9-inch, and iPad Pro 13-inch.

---

## Diner — Tablevera

### Names and short copy

| Field | Limit | Copy | Chars |
| --- | --- | --- | --- |
| App Store name | 30 | Tablevera | 9 |
| App Store subtitle | 30 | Find and book restaurants | 25 |
| Promotional text | 170 | Discover restaurants near you and reserve in seconds. Live times, waitlist alerts, and your bookings in one place. | 114 |
| Play title | 30 | Tablevera | 9 |
| Play short description | 80 | Find restaurants and book a table in seconds. Free for diners. | 62 |
| Keywords (iOS) | 100 | `restaurant,reservation,dinner,book table,dining,food,fine dining,waitlist,loyalty,near me` | 89 |

Do not put “Tablevera”, “OpenTable”, or “Resy” in keywords.

### Description (App Store + Play, 4000 max)

```
Tablevera is the free way to find restaurants and reserve a table across the United States.

Browse neighborhoods, cuisines, and dining styles. See live availability. Book in seconds — then manage the reservation from your phone.

DISCOVER
• Search by city, cuisine, or what’s near you
• Open restaurant pages with photos, menus, reviews, and hours
• Save favorites and get alerts when a table opens

RESERVE
• Pick party size, date, and time with live inventory
• Join the waitlist when a night is full
• Save a card or pay a deposit only when the restaurant requires it
• Add the booking to your calendar

MANAGE
• View upcoming and past reservations
• Modify or cancel when plans change
• Message the restaurant
• Tell the host you’re running late

REWARDS
• Earn loyalty points and unlock perks
• Share a referral code with friends

Tablevera is free for diners. Restaurant deposits and card guarantees are processed by Stripe and apply to your visit — they are not in-app purchases.

Need help? support@tablevera.online
```

### What’s New (1.0.0)

```
Welcome to Tablevera. Discover restaurants, reserve tables with live availability, and manage your bookings from your phone.
```

### Categories and rating

| Field | Value |
| --- | --- |
| Primary | Food & Drink |
| Secondary | Lifestyle |
| Age rating (iOS) | 12+ if restaurant photos/menus show alcohol; otherwise 4+. Answer the alcohol question as infrequent / not the focus. |
| IARC / Play | Everyone or Teen (same alcohol logic) |
| Price | Free |
| IAP | None. Stripe deposits are real-world dining, not digital goods. |

### URLs

| Field | URL |
| --- | --- |
| Privacy | https://tablevera.online/privacy |
| Terms | https://tablevera.online/terms |
| Support | https://tablevera.online/contact |
| Marketing | https://tablevera.online |
| Copyright | 2026 Tablevera |

### App Review notes (iOS)

```
Tablevera is a diner reservation app. Guests can browse restaurants without an account. Booking, waitlist, messages, and loyalty require sign-in.

Demo diner
Email: [PRODUCTION DINER EMAIL]
Password: [PASSWORD]

Suggested path
1. Home → pick a city → open a restaurant
2. Book a table (use a non-deposit venue if you want to skip Stripe)
3. Reservations tab → open the booking → message / running late
4. Profile → Privacy Policy and Terms

Payments: Stripe PaymentSheet for restaurant deposits and card guarantees. Apple Pay merchant ID merchant.com.tablevera.app. No In-App Purchases.

Sign-in: email/password and Google. Location, photos, calendar, and push are optional and requested only when the diner uses that feature.

Please do not use @tablevera.local seed accounts — they are not on production.
```

---

## Partner — Tablevera Partner

### Names and short copy

| Field | Limit | Copy | Chars |
| --- | --- | --- | --- |
| App Store name | 30 | Tablevera Partner | 17 |
| App Store subtitle | 30 | Host stand in your pocket | 25 |
| Promotional text | 170 | Run tonight’s book from your phone. See reservations, seat the floor, manage the waitlist, and message guests. | 110 |
| Play title | 30 | Tablevera Partner | 17 |
| Play short description | 80 | Run reservations, floor, and waitlist from your phone. | 54 |
| Keywords (iOS) | 100 | `host,reservations,floor plan,waitlist,restaurant,hospitality,manager,booking,tables` | 83 |

### Description

```
Tablevera Partner is the host-stand app for restaurants on Tablevera.

See tonight’s book, seat the floor, run the waitlist, and message guests — without being tied to the desktop.

TODAY
• Covers, reservations, waitlist, and unread messages at a glance
• Switch venues if you manage more than one restaurant

THE BOOK
• Today, upcoming, and past reservations
• Guest name, party size, time, and table
• Create phone or walk-in reservations
• Confirm, seat, complete, cancel, or mark a no-show

THE FLOOR
• Live table status: available, reserved, seated, turning
• Assign arriving parties and watch turn times

WAITLIST
• Add walk-ins, notify the next guest, and seat when a table frees
• Keep a live queue and a history of tonight’s names

GUESTS
• Two-way messages on a reservation
• Push alerts for new bookings and guest updates

Tablevera Partner is for restaurant owners and managers. Sign in with your Partner Hub account. Venue setup, billing, and team invites stay on the web dashboard at dashboard.tablevera.com.

Need help? support@tablevera.online
```

### What’s New (1.0.0)

```
The Tablevera partner app for hosts and managers. See tonight’s book, seat the floor, run the waitlist, and message guests.
```

### Categories and rating

| Field | Value |
| --- | --- |
| Primary | Business |
| Secondary | Food & Drink |
| Age rating | 4+ / Everyone |
| Price | Free |
| IAP | None |
| Audience | Restaurant owners and managers only. Reject diner logins. |

### URLs

| Field | URL |
| --- | --- |
| Privacy | https://tablevera.online/privacy |
| Terms | https://tablevera.online/terms |
| Support | https://tablevera.online/contact |
| Marketing | https://tablevera.online/for-restaurants |
| Copyright | 2026 Tablevera |

**Blocker:** the public privacy page currently says it applies to diners and that partners have “separate agreements.” Add a short partner-app paragraph (account, push token, reservation/guest data for the signed-in venue) before you submit the Partner app. Same URL is fine.

### App Review notes (iOS)

```
Tablevera Partner is a staff app for restaurant_owner and manager accounts. Diner and platform-admin logins are rejected.

Demo partner
Email: [PRODUCTION OWNER OR MANAGER EMAIL]
Password: [PASSWORD]
Venue: [RESTAURANT NAME]

Suggested path
1. Sign in → Overview (today’s covers)
2. Reservations → Today → open a booking → status actions
3. Floor → tap a table
4. Waitlist → Live
5. Messages

This app does not take diner payments. Billing and venue setup stay on the Partner Hub website.

Please do not use @tablevera.local seed accounts.
```

---

## Privacy / Data safety

Canonical policy: https://tablevera.online/privacy  
In-app diner: Profile → Privacy Policy. Partner app has no in-app policy screen — the store URL is required.

### Diner — App Store nutrition + Play Data safety

| Data | Collected | Linked to identity | Used for tracking | Why |
| --- | --- | --- | --- | --- |
| Name | Yes | Yes | No | Account |
| Email | Yes | Yes | No | Account, auth |
| Phone | Yes | Yes | No | Account, booking, SMS if opted in |
| Password | Yes (hashed) | Yes | No | Auth |
| Physical address | Optional | Yes | No | Profile |
| Photos | Optional | Yes | No | Review attachments |
| Precise location | Optional, when in use | Yes | No | Nearby restaurants. No background location. |
| Coarse location | Optional / IP | Yes | No | Nearby + security |
| User content (reviews, messages, requests) | Yes | Yes | No | Bookings and reviews |
| Customer support | Yes | Yes | No | Tickets |
| Product interaction | Yes | Yes | No | App function / analytics |
| Device ID / push token | Yes | Yes | No | Push, security |
| Payment info | Stripe only; we store last4 / brand / status | Yes | No | Deposits and card guarantees |
| Other financial (loyalty points, gift cards) | Yes | Yes | No | Rewards |
| Calendar | Write-only, optional | No (device only) | No | Add reservation event |

Declarations:

- **No ATT / IDFA.** Do not enable tracking.
- **Encryption export:** `ITSAppUsesNonExemptEncryption = false` (HTTPS/TLS only).
- **Account deletion:** honor via `support@tablevera.online` (required on both stores). Add a delete-account path in-app if Play asks for a URL — until then use the privacy contact form.
- Third parties: Stripe, Google Sign-In, Expo/FCM push, SendGrid/Twilio (server-side).

### Partner — lighter form

| Data | Collected | Linked | Tracking | Why |
| --- | --- | --- | --- | --- |
| Name, email | Yes | Yes | No | Staff account |
| Phone (guest + staff) | Yes | Yes | No | Bookings / contact |
| User content (messages, notes) | Yes | Yes | No | Service |
| Product interaction | Yes | Yes | No | App function |
| Device ID / push token | Yes | Yes | No | Staff alerts |
| Location / photos / calendar / payments in-app | No | — | — | Not requested |

---

## Icons and graphics

| Asset | File | Notes |
| --- | --- | --- |
| Diner 1024 | `docs/store/assets/diner-icon-1024.png` | Forest field, cream + gold mark. Use for App Store. |
| Diner 512 | `docs/store/assets/diner-icon-512.png` | Play hi-res icon. |
| Diner feature | `docs/store/assets/diner-feature-1024x500.png` | Wordmark + tagline. No giant app icon (Play guidance). |
| Partner 1024 | `docs/store/assets/merchant-icon-1024.png` | Cream field, original mark. Distinct from diner. |
| Partner 512 | `docs/store/assets/merchant-icon-512.png` | Play hi-res icon. |
| Partner feature | `docs/store/assets/merchant-feature-1024x500.png` | “Tablevera Partner” + host-stand line. |

### Icon issues in the binaries today

1. `apps/mobile/assets/icon.png` is **893 × 1024** (not square). Do not upload it.
2. Android adaptive `backgroundColor` is `#000000` in both `app.config.js` files. Change to `#0B3D2E` (diner) and `#FAF6EE` (partner) so the launcher matches the store icon.
3. Partner foreground includes the word **Merchant** — unreadable at 60pt. Store icons above are mark-only.
4. After changing `assets/`, rebuild native (`expo prebuild` / EAS). Metro does not update the home-screen icon.

---

## Company / developer identity

| Field | Value |
| --- | --- |
| Legal name | Tablevera |
| Support email | support@tablevera.online |
| Phone | +1 (650) 770-7788 |
| Address | 20844 Waterbeach Place, Sterling, VA 20165, USA |
| Apple Pay | `merchant.com.tablevera.app` (diner only) |
| Google Pay | Enabled on diner Stripe plugin |
| DSA (EU) | If you sell in the EU, complete trader status with the address above |

---

## Deploy checklist

### Before the first upload

- [ ] Production demo diner + partner accounts (not `@tablevera.local`)
- [ ] Privacy page covers both mobile apps (partner paragraph)
- [ ] Account-deletion contact works
- [ ] Store icons uploaded (1024 / 512), not the non-square `icon.png`
- [ ] Feature graphics uploaded
- [ ] 6 framed screenshots per app at 1320 × 2868 and 1080 × 1920
- [ ] iPad 13-inch set (or turn off `ios.supportsTablet` and ship phone-only)
- [ ] Adaptive icon backgrounds fixed + production EAS builds
- [ ] Stripe / Apple Pay / Google Sign-In work on the production diner binary
- [ ] Partner login rejects diner accounts on production

### EAS

```bash
# Diner
cd apps/mobile
eas build --profile production --platform ios
eas build --profile production --platform android
eas submit --profile production --platform ios
eas submit --profile production --platform android

# Partner
cd apps/merchant-mobile
eas build --profile production --platform ios
eas build --profile production --platform android
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

`eas.json` already points production at `https://api.tablevera.online/graphql`. Confirm Expo dashboard env + secrets (`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` on diner).

### Store consoles (first time)

1. Apple Developer: App IDs `uz.alitech.tablevera` and `uz.alitech.tablevera.merchant`, Push (APNs), Associated Domains if you add universal links, Merchant ID `merchant.com.tablevera.app`.
2. App Store Connect: two apps, SKUs `tablevera-diner` and `tablevera-partner`, primary language English (US).
3. Play Console: two apps, same package names, Data safety, IARC questionnaire, target audience 18+ for partner (staff) / 13+ or 18+ for diner depending on alcohol answer.
4. Both stores: content rights = you own the rights; no third-party catalogs you don’t have licenses for.

### Review risks

| Risk | Mitigation |
| --- | --- |
| Login wall with no demo account | Put production credentials in Review Notes |
| Partner app looks “unfinished” if Overview is zeros | Seed a busy venue for the demo user |
| Privacy URL doesn’t mention the partner app | Add the paragraph before submit |
| Payments look like IAP | Review notes: real-world dining via Stripe, no IAP |
| Screenshots show debug UI / empty states | Recapture on preview/prod with real data |
| 4.3 spam / duplicate | Different name, icon, screenshots, and audience for the two apps |
| Tablet claimed but iPad layout is phone-scaled | Provide iPad shots or disable tablet |
