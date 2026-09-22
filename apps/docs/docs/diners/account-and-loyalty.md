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

Tablevera runs a **platform loyalty** program plus optional **per-restaurant loyalty**:

| Concept | Description |
|---|---|
| Points | Earned on completed visits; redeemable per program rules |
| Tiers | Based on completed visit count (names shown in profile). Super admins set thresholds and earn multipliers in dashboard **Loyalty**. |
| Expiry | Points may expire; expiry date shown on profile |
| Referrals | Share your referral code to earn bonus points |
| Gift cards | Redeem gift card codes at checkout |
| Promo codes | Apply promotion codes during booking |

Restaurant-specific loyalty settings are configured by each partner in their dashboard.

## Reviews

After a **past visit** (staff marked `completed`, or a `confirmed`/`seated` booking whose slot has ended), you may receive a post-visit prompt to:

1. Rate Overall, Food, Service, and Atmosphere (stars start empty)
2. Optionally attach up to 3 photos and a comment
3. Save the restaurant to your favorites

Reviews appear on the public restaurant page. Partners can post a public reply from the dashboard. Cancelled, no-show, and still-pending bookings cannot be reviewed.

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

Use the public [contact form](https://tablevera.online/contact) for platform issues. For reservation-specific questions, message the restaurant from your reservation detail page.
