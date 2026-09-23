# Support & moderation

## Support tickets

Restaurant owners and managers can open tickets from Partner Hub **Support** (`/support`, `createOwnerSupportTicket`). The message is rich text; screenshots (JPEG, PNG, WebP, GIF) can be attached. Conversation is chat-style: platform staff and the requester can both reply. Internal notes stay staff-only. An admin can also file a ticket on someone’s behalf. Diners use the public contact form, not tickets.

### Ticket workflow

1. **New** — unassigned ticket arrives
2. **Assigned** — admin owner set
3. **In progress** — investigation underway
4. **Resolved** — closed with resolution notes

Ticket model: `apps/api/src/models/SupportTicket.ts`  
Admin service: `apps/api/src/services/adminSupport.ts`

### Common ticket types

- Reservation disputes (no-show, deposit refunds)
- Account access (locked out, role changes)
- Billing questions (double charge, plan confusion)
- Restaurant listing issues (wrong hours, photos)
- Bug reports

## Content moderation

**Admin → Moderation** handles user-generated content:

- Restaurant reviews reported by owners/managers (`reportReview`) or flagged by admins
- Inappropriate messages (when reported)
- Blog comments (if enabled)

### Owner review reports (reputation management)

Partners **cannot** unilaterally hide a review because they disagree with a rating or opinion (Google/Yelp-style). Primary tools:

1. **Public reply** — address the feedback on the listing
2. **Report for moderation** — structured policy reasons only:
   - Spam or advertising
   - Fake / competitor / conflict of interest
   - Off-topic (not about this restaurant or visit)
   - Hate speech, harassment, or threats
   - Private personal information
   - Illegal content or clear policy violation
   - Other (requires a written explanation)

The review **stays public** until a platform admin acts. Queue: **Admin → Moderation**.

Admin actions:

- **Dismiss** — clear the flag; review stays public
- **Hide** — remove from diner listings
- **Hide & clear** — hide and remove from the queue

Actions: approve (dismiss), hide, warn user, suspend account.

## Blog & SEO content

**Admin → Blog** publishes articles with:

- Title, slug, body (MDX-friendly)
- SEO metadata (description, OG image)
- Publish/draft status

Published posts appear on the diner web app for organic traffic.

## Email templates

**Admin → Templates** manages platform-default email templates. Partners can override branding per restaurant in their settings.

Templates cover:

- Reservation confirmation
- Reminder / no-show warnings
- Waitlist notification
- Password reset
- Survey invitations

## Platform config

**Admin → Config** exposes global settings:

- Feature flags
- Default notification behavior
- Contact form routing (`ELEVARO_LEADS_API_KEY` for lead ingest)
- Maintenance mode toggles

Changes apply immediately via `apps/api/src/services/platformConfig.ts`.

## Escalation to engineering

For production incidents, cross-reference:

- **Developer page** — missing env vars
- **Audit logs** — recent admin actions
- API logs — structured logging via `apps/api/src/lib/logger.ts`

Include GraphQL operation name, user ID, and restaurant ID when filing engineering tickets.
