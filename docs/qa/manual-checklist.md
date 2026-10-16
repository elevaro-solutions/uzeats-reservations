# Evergreen manual checklist (role + feature)

Use for **full smoke** or for surfaces touched by a release. Mark `[x]` when done. Record failures as tickets; do not sign the release until Required release-delta items pass (see `releases/`).

**Tester:** _______________ **Date:** _______________ **Env:** _______________

---

## Prep

- [ ] Accounts ready: diner, owner, manager, host, admin (and super_admin if testing destructive admin)
- [ ] Venues ready: deposit on/off, waitlist on, manual-approval if testing approval, Basic plan if testing limits
- [ ] Note app version from Admin → Developer (or CHANGELOG)

---

## By role

### Diner (web)

- [ ] Browse home / search without signing in
- [ ] Sign in / out; forgot password path (email arrives)
- [ ] Open restaurant → Book (non-deposit) → confirmation # shown
- [ ] Book with deposit (or stub) when venue requires it
- [ ] Modify + cancel with reason
- [ ] Waitlist join when no slots; My waitlist cancel
- [ ] Message restaurant from reservation; leave review after completed visit
- [ ] Saved restaurants / profile / notification prefs

### Diner (mobile)

- [ ] Cold launch; sign-in with resume to book
- [ ] Search → restaurant → Book deposit + non-deposit
- [ ] Modify / cancel; offline shows Try again (not forced logout)
- [ ] Push soft-prompt after book (if permission undetermined)

### Owner (Partner Hub)

- [ ] Login → overview; multi-location switcher if applicable
- [ ] Billing visible; managers cannot open Billing
- [ ] Team invite within package seats; seat-limit error when full
- [ ] Settings: profile, shifts/tables, closures & hours, notifications
- [ ] Grow: booking widget snippet / Google Business link
- [ ] Support ticket creates and appears for admin

### Manager

- [ ] Reservations: create phone/walk-in; seat / complete / cancel (reason)
- [ ] Live floor: assign + seat
- [ ] Waitlist Live/History; notify / seat
- [ ] Guests CRM; Reviews reply; Messages reply
- [ ] Cannot change plan / invite beyond policy

### Host

- [ ] Lands on reservations; can use waitlist, floor, guests, messages
- [ ] Cannot open billing / settings / grow hubs
- [ ] Mark no-show when mode is manual_only

### Admin

- [ ] Approve pending restaurant → appears in diner search
- [ ] Platform config / templates reachable
- [ ] Tickets queue; moderation for reported reviews
- [ ] Developer page shows version; secrets masked

---

## By feature

### Auth & roles

- [ ] Email/password on web + dashboard
- [ ] Role gates (host/manager/admin) as above
- [ ] Logout clears session (mobile: push token unregistered)

### Discovery & booking

- [ ] Search / city / map (if Maps key)
- [ ] Party size min/max + Large party CTA
- [ ] Manual approval copy (Send request / Awaiting approval)
- [ ] Widget book attributes source=widget

### Waitlist

- [ ] Join → notify → book converts to booked
- [ ] Partner seat walk-in from waitlist

### Floor & tables

- [ ] Layout edit / publish; Live floor status
- [ ] Merchant mobile Plan view seats guest

### Billing & deposits

- [ ] Partner subscription / invoice pay path (test mode OK)
- [ ] Deposit hold on book; diner billing history

### Notifications

- [ ] Booking confirm email/SMS/push per prefs
- [ ] Reminder / running-late path if testing that train

### Reviews & loyalty

- [ ] Complete visit → points; leave review; partner reply

### Holidays & closures (when in scope)

- [ ] Catalog holiday Name (key); approval-before-close; date override

### Virtual 3D (experimental, when enabled)

- [ ] Partner editor show-to-guests; diner 3D table pick completes book

---

## Sign-off (full smoke only)

Not a release gate by itself — use the **release file** for ship sign-off.

| Field | Value |
|---|---|
| Tester | |
| Date (YYYY-MM-DD) | |
| Env / SHA | |
| Result | Pass / Fail / Partial |
| Notes | |
