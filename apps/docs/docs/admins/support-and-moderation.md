# Support & moderation

## Support tickets

Diners and partners can open support requests that land in **Admin → Support**.

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

- Restaurant reviews flagged by diners or auto-rules
- Inappropriate messages (when reported)
- Blog comments (if enabled)

Actions: approve, hide, warn user, suspend account.

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
