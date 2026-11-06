---
sidebar_position: 2
title: Role and feature checklist
description: Evergreen manual smoke by role and by feature.
---

# Role and feature checklist

Use for a full smoke, or only the surfaces a release touched. Record failures in Partner Hub `/admin/qa/issues`. Do not sign a release until its **Required** items pass on the active checklist at `/admin/qa`.

**Tester:** _______________ **Date:** _______________ **Env:** _______________

## Prep

- [ ] Accounts ready: diner, owner, manager, host, admin (super admin if testing destructive admin)
- [ ] Venues ready: deposit on and off, waitlist on, manual approval if testing approval, Basic plan if testing limits
- [ ] Note the app version from Admin → Developer

## By role

### Diner (web)

- [ ] Browse home and search without signing in
- [ ] Sign in and out; forgot-password email arrives
- [ ] Open a restaurant, book without a deposit, confirmation number shown
- [ ] Book with a deposit when the venue requires one
- [ ] Modify and cancel with a reason
- [ ] Join the waitlist when no slots; cancel from My waitlist
- [ ] Message the restaurant from a reservation; leave a review after a completed visit
- [ ] Saved restaurants, profile, notification preferences

### Diner (mobile)

- [ ] Cold launch; sign-in resumes the booking
- [ ] Search → restaurant → book with and without a deposit
- [ ] Modify and cancel; offline shows Try again (not a forced logout)
- [ ] Push prompt after booking when permission is still undecided

### Owner (Partner Hub)

- [ ] Login lands on overview; with multiple venues it lands on **All restaurants** and the switcher scopes pages and alerts
- [ ] Billing is visible; a manager cannot open Billing
- [ ] Default payment card shows on Billing and can be replaced; **Pay all invoices** settles open invoices
- [ ] Settings → Account → Agreements opens the Partner Agreement and signed-copy PDF
- [ ] Team invite stays within package seats; a full package shows a seat-limit error
- [ ] Settings: profile, shifts and tables, closures and hours, notifications
- [ ] Grow: booking widget snippet and Google Business link
- [ ] A support ticket shows up in the admin queue

### Manager

- [ ] Reservations: phone and walk-in; seat, complete, cancel with a reason; find by 6-digit confirmation number
- [ ] Live floor Tables view: drag a guest onto a tile; the table drawer seats, completes, and lists Upcoming today
- [ ] Waitlist Live and History; notify and seat
- [ ] Guests, review replies, message replies
- [ ] Cannot change the plan

### Host

- [ ] Lands on reservations; can use waitlist, floor, guests, and messages
- [ ] Cannot open billing, settings, or grow
- [ ] Can mark a no-show when the mode is manual only

### Admin

- [ ] Approving a pending restaurant makes it appear in diner search
- [ ] Platform config and templates open
- [ ] Tickets queue; reported reviews can be moderated
- [ ] Developer page shows the version; secrets are masked

## By feature

### Auth and roles

- [ ] Email and password on diner web and Partner Hub
- [ ] Role gates above hold
- [ ] Logout clears the session (mobile unregisters push)

### Discovery and booking

- [ ] Search, city, and map (when a Maps key is set)
- [ ] Party size min and max, plus the Large party call-to-action
- [ ] Manual approval copy: Send request / Awaiting approval
- [ ] A widget booking is attributed as source widget

### Waitlist

- [ ] Join, then notify, then a booking marks the entry booked
- [ ] Partner can seat a walk-in from the waitlist

### Floor and tables

- [ ] Edit and publish a layout; live floor status updates
- [ ] Merchant mobile Plan view can seat a guest

### Billing and deposits

- [ ] Partner subscription or invoice pay path (test mode is fine)
- [ ] Card guarantee booking saves a card without charging; a no-show charge and refund work from the detail page
- [ ] A declined auto-charge shows the **Automatic charge failed** banner and appears on Admin → Failed charges

### Menu and online ordering

- [ ] Menu editor search, reorder, Popular star (x / 10), and the Unsaved changes bar
- [ ] Online ordering link shows **Order online** on the diner page with UTM tags; switching it off hides the button

### Notifications

- [ ] Booking confirmation follows channel preferences
- [ ] Reminder and running-late path when that train is in scope

### Reviews and loyalty

- [ ] Completing a visit awards points; diner can review; partner can reply

### Holidays and closures

- [ ] Holiday shows as Name (key); closing needs approval; a date override works

### Virtual 3D (when enabled)

- [ ] Partner can show the room to guests; a diner can finish a booking after a 3D table pick

## Full-smoke record

This block is not the release gate. Use the release page for ship sign-off.

| Field | Value |
|---|---|
| Tester | |
| Date (YYYY-MM-DD) | |
| Env / SHA | |
| Result | Pass / Fail / Partial |
| Notes | |
