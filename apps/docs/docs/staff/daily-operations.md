# Daily operations

## Reservations

The **Reservations** page is the primary operational view:

- Filter by date, status (confirmed, seated, completed, cancelled, no-show)
- Create **phone** or **walk-in** bookings (`ReservationSource`: `phone`, `walkin`)
- Edit party size, time, table assignment, and internal notes
- Mark guests as **seated**, **completed**, or **no-show**
- Share booking links (`/r/{slug}`) with guests

### Reservation statuses

| Status | Meaning |
|---|---|
| `pending` | Awaiting confirmation (e.g. deposit hold) |
| `confirmed` | Active booking |
| `seated` | Guest arrived and is dining |
| `completed` | Visit finished — triggers loyalty and review prompts |
| `cancelled` | Cancelled by guest or staff |
| `no_show` | Guest did not arrive (may trigger auto-detection via worker) |

## Floor plan

The **Floor plan** editor lets you:

- Arrange tables on a canvas
- See real-time status (available, reserved, seated)
- Drag-assign reservations to tables
- Support multiple dining areas / rooms

Floor plan state is stored per restaurant and synced via GraphQL.

## Waitlist

When fully booked:

1. Add guests to the waitlist with party size and contact info
2. System ranks by join time and preferences
3. On cancellation, eligible parties are **notified** (SMS, email, push per prefs)
4. Convert notified entries to confirmed reservations

## Guest messaging

**Messages** provides reservation-scoped threads:

- Reply to diner inquiries from the restaurant page
- Proactive messages (e.g. running late, special prep)
- Staff receive **new message** notifications per channel prefs

## Walk-in and phone bookings

Owners and staff can book without a diner account:

- Capture guest name and phone
- Select table and time manually
- Source is recorded as `phone` or `walkin` for reporting

## Blackouts & access rules

Under **Settings**:

- **Blackouts** — block dates/times ( holidays, private events)
- **Access rules** — restrict online booking by party size, lead time, or membership

## Menu management

Upload menu sections and items. Images use presigned uploads to DigitalOcean Spaces (stubbed locally).

Partners can also **import** menu data from DoorDash/Uber Eats MHTML exports (admin import flow).

## Operational notifications

Configure which events ping you and on which channels:

- New reservation
- Guest spend alerts
- Waitlist conversion
- New messages
- Survey invitations

Settings → **Notifications**.

## End of service

After marking reservations **completed**:

- Loyalty points accrue for signed-in diners
- Post-visit review prompt is sent
- Reports update for the service period

## Shareable links

Copy a direct booking link from **Booking widget** or build URLs:

```
https://tablevera.online/r/{restaurant-slug}
```

Toggle **accept online reservations** and **hide widget** in restaurant settings when needed.
