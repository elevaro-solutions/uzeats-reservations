# Mobile beta readiness QA — Tablevera diner

**App:** `apps/mobile` (Tablevera)  
**Scope:** Simulator / emulator only (physical devices = follow-up)  
**Policy:** Execute checklist; file P0/P1 bugs; sign off when critical E2E passes on ≥1 iOS + ≥1 Android simulator with **no open P0s**.

Related: [prior booking QA](./qa-booking-mobile-2026-09-08.md), [permissions matrix](./mobile-privacy-permissions.md).

## Environments

| Profile | API | Notes |
| --- | --- | --- |
| Local | `EXPO_PUBLIC_API_URL` → machine IP `/graphql` | Best for deposit stubs + seed control |
| Preview / production build | `https://api.tablevera.online/graphql` | EAS `preview` / `production` |

Seed diner (local): see API seed output (e.g. `dan@…` / `Password123!`). Re-seed after seed-script changes so addresses/hours/descriptions refresh.

## Device matrix (simulators)

| Platform | Device | OS | Role |
| --- | --- | --- | --- |
| iOS | iPhone SE (3rd gen) | Latest Xcode runtime | Small + keyboard / tap targets |
| iOS | iPhone 16 / 16 Pro | Latest | Representative phone |
| iOS | iPad | Latest | `supportsTablet: true` layout |
| Android | Pixel 3a (or small) | API 29–30 | Older OS |
| Android | Pixel 7 | API 34–35 | Current baseline |

Record exact OS versions in the sign-off table when run.

## Severity

| Level | Definition | Beta gate |
| --- | --- | --- |
| **P0** | Blocks book / pay / auth / crash on launch | Must fix before beta |
| **P1** | Wrong diner-facing data, broken modify/cancel, hard session loss on flaky net | Should fix before beta |
| **P2** | Polish, warnings, rare paths | Track; may ship |
| **P3** | Cosmetic | Track |

## Critical E2E scripts

### A. Auth

1. Cold launch → Home browsable without sign-in.
2. Email sign-in → lands on intended `next` (e.g. book with `resume=1`).
3. Sign-up → Terms links open in-app Privacy / Terms.
4. Forgot password → success message (reset email targets **web** until mobile deep-link exists).
5. Google Sign-In if client IDs configured; otherwise skip and note.
6. Logout → SecureStore cleared; guest CTAs return.

### B. Discovery → search → profile

1. Home: location label, dining styles, cuisines, popular / top-rated cards.
2. Search: query, filters sheet, party/date/time, results FlashList, retry on error.
3. Open restaurant → hero, tabs (details/menu/reviews/photos), sticky Book.

### C. Book (deposit + non-deposit)

1. **Samarkand Palace** (deposit): Book → pick slot (chip selected, Continue enabled) → details → terms → confirm → confirmation shows **reservationId** (not error empty state).
2. **Non-deposit** venue (e.g. Teahouse / Choyxona Jersey): same path without PaymentSheet (or stub succeeds).
3. Profile Book while logged out → sign-in `next` includes `?resume=1`.
4. Party too large (e.g. 12+) → empty / call UI, no crash.
5. Fully booked day → waitlist CTA if inventory empty.

### D. Modify + cancel

1. Reservations tab → upcoming detail → Edit → change time/party → save.
2. Overflow → Cancel → reason → status cancelled; list updates.

### E. Notifications

1. Inbox `/notifications` — list, mark read / mark all, detail sheet.
2. `/notification-settings` — Enable / disable; offline session shows retry not guest CTA.
3. Push tap deep-link: **limited on simulators** (especially iOS); note N/A if no token.

### F. Offline / retry

| Step | Action | Expected |
| --- | --- | --- |
| Cold start offline with stored tokens | Airplane mode before launch | `sessionOffline`; Profile/Reservations/Favorites/Notifications show **Try again**, not forced sign-out |
| Mid-session API down | Kill API or airplane during search / availability | Error + retry; no crash |
| Flaky 401 refresh | Network fail during token refresh | Tokens kept; no hard sign-out (`errorLink` network path) |
| Create reservation offline | Submit with no network | Clear error; draft retained if applicable |

### G. Accessibility / input

1. iOS Dynamic Type / Android font scale **Large**: primary screens readable; Book CTA usable.
2. VoiceOver / TalkBack smoke: Book CTA, time chips (labels), confirm sheet, sign-in fields.
3. Keyboard: email/password, special requests — fields visible above keyboard; dismiss works.
4. Tap targets: time chips and favorite heart ≥ ~44pt.

### H. Performance smoke

1. Cold start → Home first paint feels acceptable on SE / Pixel 3a.
2. Search scroll: no sustained blank frames; images use `RemoteImage` cache.
3. Home popular/top-rated request `limit` matches visible cards.

## Android stability (Unreleased)

Confirm on emulator:

- [ ] App launches (no `expo-linear-gradient` / `LazyKType` crash)
- [ ] `google-services.json` present; push register does not crash (token may be null on emulator)
- [ ] Notification settings does not race double-register with `PushBootstrap`

## Sign-off

| Check | iOS simulator | Android emulator | Notes |
| --- | --- | --- | --- |
| Device / OS | iPhone 16e (Booted) | Pixel_7_Pro AVD available | Installed iOS binary still `com.tablevera.app` (pre-rename); rebuild as `uz.alitech.tablevera` for beta |
| Auth A | Pending interactive | Pending | Soft-gate + sessionOffline code paths verified |
| Discovery/search/profile B | Deep link `tablevera://` / `tablevera://search` opened without crash | Pending | |
| Book deposit C1 | Pending interactive | Pending | Submit navigates with `params: { reservationId }` — prior P0 closed in code |
| Book non-deposit C2 | Pending interactive | Pending | |
| Modify/cancel D | Pending interactive | Pending | |
| Notifications E | Pending interactive | Pending | |
| Offline F | Code fixed | Code fixed | `errorLink` network refresh no longer hard-signs-out; Favorites offline gate added |
| A11y/input G | Code updated | Code updated | Slot labels + ≥44pt chips / favorite |
| Open P0 count | **0 known in code** | **0 known in code** | Interactive book smoke still required before claiming beta ready |

### Execution log — 2026-09-16

- Mobile `tsc` typecheck: **pass**
- iPhone 16e: launched installed Tablevera (`com.tablevera.app` pid live); deep links did not crash process
- Local API (`:4000`) not running in this session — full createReservation UI smoke blocked
- Android: Pixel_7_Pro AVD starts briefly then drops off `adb` in this environment (no diner APK installed). Treat Android UI smoke as **manual follow-up** after `eas build --profile preview --platform android` + install
- Prior P0s (slot selection wiring, confirmation `reservationId`): **closed in code review** (`onSelectSlot` → state; `router.replace` with `reservationId`)
- Remaining gate for acceptance: one manual Samarkand + one non-deposit book on iOS 16e and Android emulator against preview/local API

**Beta ready when:** Critical book path (C) passes on ≥1 iOS + ≥1 Android row, and open P0s = 0.

## Follow-ups (out of this pass)

- Physical devices + real FCM/APNs
- TestFlight / Play internal testing + store screenshots
- Maestro/Detox automation
- CI EAS build job
- Mobile-specific password-reset deep links (`app: "mobile"`)
