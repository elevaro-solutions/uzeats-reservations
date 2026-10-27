# Account & loyalty

## Your profile

After signing in, manage:

- Name, email, phone
- Password (or link Google / phone auth)
- Notification channel preferences (email, web push, in-app; SMS opt-in stays on `/sms`)
- Telegram linking for bot notifications (optional)

## Reservations

View all reservations filtered by:

- **Upcoming** — confirmed and pending future visits
- **Past** — completed history
- **Deposits** — reservations with payment holds

Each reservation has a detail page with:

- Date, time, party size, occasion
- Restaurant contact and address
- **Message the restaurant** — reservation-scoped chat
- Edit options (where allowed)
- Add to calendar

## Loyalty program

Tablevera runs a **platform loyalty** program plus optional **per-restaurant loyalty**. On the web, open **Loyalty & rewards** from the account menu or the link on your profile card (`/profile/loyalty`) to see your balance, status, referral code, restaurant rewards, points history, and how the program works.

| Concept | Description |
|---|---|
| Points | Earned on completed visits, paid deposits, your first booking, and reviews. Redeem them as a discount on a booking deposit once you reach the minimum. |
| Tiers | Based on completed visit count. Higher tiers multiply visit points. Super admins set thresholds and earn multipliers in dashboard **Loyalty**. |
| Expiry | Each credit expires a set number of months after it was earned; the earliest expiry date is shown on the loyalty page. Oldest points are used first. |
| Referrals | Share your referral code or invite link to earn bonus points (awarded after the friend’s first completed visit) |
| Restaurant rewards | Restaurants that turn on their own loyalty award extra points on completed visits. Those points show on the loyalty page and only work at that restaurant. |
| Gift cards | Redeem gift card codes at checkout |
| Promo codes | Apply promotion codes during booking |

Restaurant-specific loyalty settings are configured by each partner in their dashboard.
## Reviews

After a **past visit** (managers marked `completed`, or a `confirmed`/`seated` booking whose slot has ended), you may receive a post-visit prompt to:

1. Rate Overall, Food, Service, and Atmosphere (stars start empty)
2. Optionally attach up to 3 photos and a comment
3. Save the restaurant to your favorites

Reviews appear on the public restaurant page. Open **My reviews** from the account menu (`/reviews`) to see your ratings, photos, and any restaurant replies. Partners can post a public reply from the dashboard. Partners may report a review for platform moderation when it violates policy (spam, fake, hate, private info, etc.); they cannot hide a review only because they disagree with the rating. Cancelled, no-show, and still-pending bookings cannot be reviewed.

## Billing history

Visit `/billing` to see deposit charges and payment history tied to your account (Stripe-powered in production).

## Saved restaurants

`/saved` lists bookmarked restaurants for quick rebooking and availability alerts.

## Privacy & legal

- [Privacy policy](https://tablevera.online/privacy)
- [Terms of service](https://tablevera.online/terms)
- [SMS opt-in](https://tablevera.online/sms) — required for transactional SMS
- Cookie consent banner on first visit

## Support

The public [contact form](https://tablevera.online/contact) is the diner support path. For reservation-specific questions, message the restaurant from your reservation detail page.
