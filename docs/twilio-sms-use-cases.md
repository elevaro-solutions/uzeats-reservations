# Tablevera — Twilio Toll-Free Verification (TFV) brief

Aligned with Twilio’s guide:
[Improving Your Chances of Toll-Free Verification Approval](https://www.twilio.com/en-us/blog/insights/best-practices/improving-your-chances-of-toll-free-verification-approval)

Public opt-in page (screenshot this for Opt-In Image URLs): **https://tablevera.online/sms**  
Direct form anchor: **https://tablevera.online/sms#sms-opt-in-form**

---

## 1) Business information (paste into Console)

| Field | Value |
| --- | --- |
| Legal / DBA name | Tablevera (include LLC legal name + DBA if different) |
| Website | https://tablevera.online |
| Business email | support@tablevera.online *(use @tablevera.online — not Gmail)* |
| Support phone | +1 (650) 770-7788 |
| Address | 20844 Waterbeach Place, Sterling, VA 20165, USA |
| Privacy policy | https://tablevera.online/privacy |
| Terms | https://tablevera.online/terms |
| SMS / opt-in | https://tablevera.online/sms |

Checklist from Twilio:

- [ ] Business name, website, and email domain match and are publicly reachable
- [ ] Site is live (not password-protected / empty / under construction)
- [ ] Legal name matches records; include DBA if customers know you as Tablevera

---

## 2) Use case summary (paste — be specific, not “Status” / “Marketing”)

> This toll-free number will be used by Tablevera to send transactional SMS to diners who opt in: reservation confirmations, reminders, cancellations/updates, and waitlist or table-availability alerts related to bookings on tablevera.online. One-time verification codes may also be sent when a user requests phone authentication. Tablevera does not use this number for marketing or promotional SMS campaigns to diners. Message frequency varies (typically a few messages per reservation). Message and data rates may apply. Reply STOP to opt out, HELP for help.

**Shorter alternate (if character-limited):**

> This number will be used to send reservation confirmations, reminders, cancellations, and waitlist/table-ready alerts to customers of Tablevera who opt in on tablevera.online.

---

## 3) Opt-in method: Web / Online

**Select:** Web / Online opt-in

### Opt-in workflow description (paste)

> Diners opt in on Tablevera’s standalone SMS page at https://tablevera.online/sms. They enter their mobile number and must check an unchecked consent checkbox that names Tablevera and discloses transactional reservation/waitlist SMS, message frequency, msg & data rates, and STOP/HELP. Consent is separate from Terms of Service and Privacy Policy and is not required to book a table. Diners may also optionally check the same type of consent on the create-account form at https://tablevera.online/login (checkbox not pre-selected). SMS for reservation events defaults to off until the user opts in. Users can also enable SMS under Profile → Notification preferences. Opt-out: reply STOP, turn off SMS in profile, or email support@tablevera.online.

### Opt-In Image URLs / evidence for reviewers

1. Screenshot of https://tablevera.online/sms showing the **SMS opt-in form** (phone field + unchecked checkbox + submit).
2. Screenshot of https://tablevera.online/login → Create account tab showing the optional SMS consent checkbox (unchecked by default).
3. Optional: https://tablevera.online/profile#notifications SMS toggle.

### Sample checkbox copy (must stay branded + not pre-checked)

> Please check this box to opt in to automated transactional SMS from Tablevera about my reservations and waitlist status. Message frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help. See our SMS Terms and Privacy Policy.

---

## 4) Twilio TFV rules we followed

| Requirement | How Tablevera complies |
| --- | --- |
| Opt-in not buried in Terms/Privacy | Standalone form on `/sms` |
| Checkbox not pre-selected | `smsConsent: false` by default |
| Branded with end-business name | “Tablevera” in checkbox + logo on site |
| Consent not shared / sold | Stated on `/sms`; no marketing SMS to diners |
| One use case per consent | Transactional reservation/waitlist notifications only (not marketing) |
| Clear use case text | See section 2 above |

---

## 5) Sample messages (paste into TFV)

1. `Your Tablevera verification code is 123456. It expires in 10 minutes. Do not share this code.`
2. `Tablevera: Your reservation at Samarkand Palace is confirmed.`
3. `Tablevera: Reminder — Bella Vista tomorrow at 7:00 PM. Reply STOP to opt out.`
4. `Tablevera: Your table is ready! Please check in with the host.`
5. `Tablevera: A table opened up on Sat, Aug 15. Book now before it's gone.`

---

## 6) Message types & examples (detail)

| Type | Use case | Example |
| --- | --- | --- |
| 2FA / OTP | User requests phone verification | `Your Tablevera verification code is 123456…` |
| Account notification | Reservation confirmed | `Tablevera: Your reservation at Samarkand Palace is confirmed.` |
| Account notification | Reminder before dining | `Tablevera: Reminder — Bella Vista tomorrow at 7:00 PM…` |
| Customer care | Waitlist table ready | `Tablevera: Your table is ready! Please check in with the host.` |
| Customer care | Favorite-table opening | `Tablevera: A table opened up on Sat, Aug 15…` |

OTP is only sent when the user requests a code. Ongoing reservation SMS requires explicit opt-in (form, registration checkbox, or profile toggle).

---

## 7) Opt-out & help

| Keyword | Behavior |
| --- | --- |
| **STOP** | Unsubscribe; one confirmation SMS |
| **HELP** | Support contact: support@tablevera.online / +1 (650) 770-7788 |

Also: Profile SMS toggle off, or email support@tablevera.online.

---

## 8) Before you submit

1. Deploy so `/sms`, `/privacy`, and `/terms` are live on https://tablevera.online.
2. Take screenshots of the opt-in form (checkbox **unchecked**).
3. Use business email `@tablevera.online`.
4. Paste the use-case paragraph from section 2 — do not write only “Notifications” or “Status”.
5. Confirm you are **not** claiming marketing SMS unless you add a separate marketing opt-in later.
