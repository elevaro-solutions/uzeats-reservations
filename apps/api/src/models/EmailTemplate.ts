import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import {
  EMAIL_BRAND,
  emailButton,
  emailButtons,
  emailDetailBox,
  emailGreeting,
  emailLinkFallback,
  emailMuted,
  emailNotice,
  emailParagraph,
} from '../services/emailBranding.js';

const emailTemplateSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: [
        'password_reset',
        'email_verification',
        'booking_confirmation',
        'booking_pending',
        'booking_updated',
        'booking_reminder',
        'booking_reminder_late',
        'booking_cancelled',
        'deposit_refunded',
        'no_show_fee_charged',
        'no_show_fee_refunded',
        'waitlist_available',
        'staff_invite',
        'restaurant_approved',
        'restaurant_created',
        'invoice_ready',
        'docs_access_otp',
      ],
    },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    bodyText: { type: String, default: '' },
    description: { type: String, default: '' },
    updatedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export type EmailTemplateDocument = InferSchemaType<typeof emailTemplateSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const EmailTemplate: Model<EmailTemplateDocument> =
  mongoose.models.EmailTemplate ??
  mongoose.model<EmailTemplateDocument>('EmailTemplate', emailTemplateSchema);

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    key: 'password_reset',
    name: 'Password reset',
    subject: 'Reset your Tablevera password',
    description: 'Sent when a user or admin requests a password reset.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('We received a request to reset your Tablevera password. Click the button below to choose a new password.'),
      emailButton('{{resetUrl}}', 'Reset password'),
      emailLinkFallback('{{resetUrl}}'),
      emailMuted('This link expires in 1 hour. If you didn\'t request this, you can safely ignore this email.'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nWe received a request to reset your Tablevera password.\n\nUse this link to reset your password:\n{{resetUrl}}\n\nThis link expires in 1 hour. If you did not request a reset, you can ignore this email.',
  },
  {
    key: 'email_verification',
    name: 'Email verification',
    subject: 'Your Tablevera verification code',
    description: 'Sent after signup when email verification is required.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Welcome to Tablevera. Enter this code to confirm your email address and finish setting up your account.'),
      emailDetailBox([{ label: 'Verification code', value: '{{code}}' }]),
      emailMuted('This code expires in 10 minutes. If you didn\'t create an account, you can safely ignore this email.'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nWelcome to Tablevera. Enter this code to confirm your email:\n\n{{code}}\n\nThis code expires in 10 minutes. If you did not create an account, you can ignore this email.',
  },
  {
    key: 'booking_confirmation',
    name: 'Booking confirmation',
    subject: 'Reservation confirmed at {{restaurantName}}',
    description: 'Sent after a diner books successfully.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Great news — your reservation is confirmed. We look forward to seeing you. Add it to your calendar so you do not miss it.'),
      '{{detailBox}}',
      emailButton('{{calendarUrl}}', 'Add to Google Calendar'),
      emailButton('{{reservationUrl}}', 'View reservation'),
      emailLinkFallback('{{reservationUrl}}'),
      emailMuted('A calendar file is attached to this email.'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nYour reservation at {{restaurantName}} on {{date}} for {{partySize}} is confirmed.\n\nGuest: {{guestName}}\nOccasion: {{occasion}}\nSpecial requests: {{guestNotes}}\nAddress: {{address}}\n\nAdd to Google Calendar: {{calendarUrl}}\nView reservation: {{reservationUrl}}\n\nA calendar file is attached to this email.',
  },
  {
    key: 'booking_pending',
    name: 'Booking request',
    subject: 'Request sent to {{restaurantName}}',
    description: 'Sent when a reservation is waiting for the restaurant to confirm.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Your reservation request at <strong>{{restaurantName}}</strong> for {{partySize}} on {{date}} was received.'),
      emailParagraph('The restaurant will confirm shortly. You\'ll get another message when it\'s approved.'),
      emailButton('{{reservationUrl}}', 'View request'),
      emailLinkFallback('{{reservationUrl}}'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nYour reservation request at {{restaurantName}} for {{partySize}} on {{date}} was received. The restaurant will confirm shortly.\n\nView request: {{reservationUrl}}',
  },
  {
    key: 'booking_updated',
    name: 'Booking updated',
    subject: 'Reservation updated — {{restaurantName}}',
    description: 'Sent when a diner\'s reservation is changed.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Your reservation at <strong>{{restaurantName}}</strong> was updated.'),
      emailDetailBox([
        { label: 'Restaurant', value: '{{restaurantName}}' },
        { label: 'Date & time', value: '{{date}}' },
        { label: 'Party size', value: '{{partySize}}' },
      ]),
      emailButton('{{reservationUrl}}', 'View reservation'),
      emailLinkFallback('{{reservationUrl}}'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nYour reservation at {{restaurantName}} was updated.\n\nDate & time: {{date}}\nParty size: {{partySize}}\n\nView reservation: {{reservationUrl}}',
  },
  {
    key: 'booking_reminder',
    name: 'Booking reminder',
    subject: 'Reminder: {{restaurantName}}',
    description: 'Sent 24 hours before the reservation, with a link to the booking.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Just a reminder about your upcoming reservation at <strong>{{restaurantName}}</strong>.'),
      emailDetailBox([
        { label: 'Restaurant', value: '{{restaurantName}}' },
        { label: 'Date & time', value: '{{date}}' },
        { label: 'Party size', value: '{{partySize}}' },
      ]),
      emailButton('{{reservationUrl}}', 'View reservation'),
      emailLinkFallback('{{reservationUrl}}'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nJust a reminder about your upcoming reservation at {{restaurantName}}.\n\nRestaurant: {{restaurantName}}\nDate & time: {{date}}\nParty size: {{partySize}}\n\nView reservation: {{reservationUrl}}\n\nReservation: {{reservationUrl}}',
  },
  {
    key: 'booking_reminder_late',
    name: 'Running late reminder',
    subject: 'Are you running late for {{restaurantName}}?',
    description: 'Sent 2 hours and 30 minutes before the reservation, with running-late actions and a booking link.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Your reservation at <strong>{{restaurantName}}</strong> is coming up. Are you running late?'),
      emailDetailBox([
        { label: 'Restaurant', value: '{{restaurantName}}' },
        { label: 'Date & time', value: '{{date}}' },
        { label: 'Party size', value: '{{partySize}}' },
      ]),
      emailButtons([
        { href: '{{lateUrl}}', label: "I'm running late" },
        { href: '{{reservationUrl}}', label: "I'm on time", variant: 'outline' },
      ]),
      emailMuted(
        `If the buttons do not work, copy these links:<br />I'm running late: <a href="{{lateUrl}}" style="color:${EMAIL_BRAND.brand};word-break:break-all;overflow-wrap:anywhere;display:inline-block;max-width:100%;">{{lateUrl}}</a><br />Reservation: <a href="{{reservationUrl}}" style="color:${EMAIL_BRAND.brand};word-break:break-all;overflow-wrap:anywhere;display:inline-block;max-width:100%;">{{reservationUrl}}</a>`,
      ),
    ].join(''),
    bodyText:
      "Hi {{firstName}},\n\nYour reservation at {{restaurantName}} is coming up. Are you running late?\n\nRestaurant: {{restaurantName}}\nDate & time: {{date}}\nParty size: {{partySize}}\n\nI'm running late: {{lateUrl}}\nI'm on time: {{reservationUrl}}\n\nReservation: {{reservationUrl}}",
  },
  {
    key: 'booking_cancelled',
    name: 'Booking cancelled',
    subject: 'Reservation cancelled — {{restaurantName}}',
    description: 'Sent when a booking is cancelled.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Your reservation has been cancelled.'),
      emailDetailBox([
        { label: 'Restaurant', value: '{{restaurantName}}' },
        { label: 'Date & time', value: '{{date}}' },
        { label: 'Reason', value: '{{reason}}' },
      ]),
      '{{messageSection}}',
      emailButton('{{reservationUrl}}', 'View reservation'),
      emailLinkFallback('{{reservationUrl}}'),
      emailMuted('If you didn\'t request this cancellation or have questions, please contact the restaurant directly.'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nYour reservation at {{restaurantName}} on {{date}} was cancelled.\n\nReason: {{reason}}{{messageText}}\n\nView reservation: {{reservationUrl}}',
  },
  {
    key: 'deposit_refunded',
    name: 'Deposit refunded',
    subject: 'Deposit refunded — {{restaurantName}}',
    description: 'Sent when a booking deposit is refunded.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Your <strong>{{amount}}</strong> deposit for <strong>{{restaurantName}}</strong> was refunded{{note}}'),
      emailButton('{{reservationUrl}}', 'View reservation'),
      emailLinkFallback('{{reservationUrl}}'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nYour {{amount}} deposit for {{restaurantName}} was refunded{{note}}\n\nView reservation: {{reservationUrl}}',
  },
  {
    key: 'no_show_fee_charged',
    name: 'No-show fee charged',
    subject: '{{feeTitle}}',
    description: 'Sent when a no-show or late-cancellation fee is charged to the saved card.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('A <strong>{{amount}}</strong> {{feeLabel}} fee for <strong>{{restaurantName}}</strong> was charged to your saved card, per the restaurant\'s policy.'),
      emailButton('{{reservationUrl}}', 'View reservation'),
      emailLinkFallback('{{reservationUrl}}'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nA {{amount}} {{feeLabel}} fee for {{restaurantName}} was charged to your saved card, per the restaurant\'s policy.\n\nView reservation: {{reservationUrl}}',
  },
  {
    key: 'no_show_fee_refunded',
    name: 'Fee refunded',
    subject: 'Fee refunded — {{restaurantName}}',
    description: 'Sent when a charged no-show or late-cancellation fee is refunded.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('<strong>{{restaurantName}}</strong> refunded your <strong>{{amount}}</strong> fee{{note}}'),
      emailButton('{{reservationUrl}}', 'View reservation'),
      emailLinkFallback('{{reservationUrl}}'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\n{{restaurantName}} refunded your {{amount}} fee{{note}}\n\nView reservation: {{reservationUrl}}',
  },
  {
    key: 'waitlist_available',
    name: 'Waitlist available',
    subject: 'A table opened up at {{restaurantName}}',
    description: 'Waitlist availability notification.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Good news — a table just became available at <strong>{{restaurantName}}</strong>. Spots fill quickly, so book now to secure your seat.'),
      emailButton('{{bookUrl}}', 'Book now'),
      emailMuted('This availability may be limited. If you no longer need a table, you can ignore this email.'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nA table is available at {{restaurantName}}. Book soon before it fills again.\n\n{{bookUrl}}',
  },
  {
    key: 'staff_invite',
    name: 'Manager invite',
    subject: 'You are invited to {{restaurantName}} on Tablevera',
    description: 'Sent when an admin or owner invites a manager.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('You\'ve been invited to join <strong>{{restaurantName}}</strong> on Tablevera as <strong>{{role}}</strong>.'),
      emailParagraph('Accept the invitation to access your restaurant dashboard, manage reservations, and collaborate with your team.'),
      emailButton('{{inviteUrl}}', 'Accept invitation'),
      emailLinkFallback('{{inviteUrl}}'),
      emailMuted('If you weren\'t expecting this invitation, you can safely ignore this email.'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nYou have been invited to manage {{restaurantName}} as {{role}}.\n{{inviteUrl}}',
  },
  {
    key: 'restaurant_approved',
    name: 'Restaurant approved',
    subject: '{{restaurantName}} is live on Tablevera',
    description: 'Sent when a restaurant listing is approved.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Congratulations — <strong>{{restaurantName}}</strong> has been approved and is now live on Tablevera.'),
      emailNotice('Diners can now discover your restaurant, view availability, and make reservations online.'),
      emailButton('{{dashboardUrl}}', 'Go to dashboard'),
      emailMuted('Need help getting started? Visit our help center or reach out to our support team.'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\n{{restaurantName}} has been approved and is now visible to diners.',
  },
  {
    key: 'restaurant_created',
    name: 'Restaurant created',
    subject: 'Welcome to Tablevera — {{restaurantName}} is ready',
    description: 'Sent to the owner when an admin creates their restaurant account. Includes onboarding next steps and first invoice details.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Your restaurant <strong>{{restaurantName}}</strong> has been set up on Tablevera. Here\'s what to do next to go live.'),
      emailDetailBox([
        { label: 'Restaurant', value: '{{restaurantName}}' },
        { label: 'Package', value: '{{plan}}' },
        { label: 'Invoice', value: '{{invoiceNumber}}' },
        { label: 'Amount due', value: '{{amount}}' },
        { label: 'Due date', value: '{{dueDate}}' },
      ]),
      emailButton('{{billingUrl}}', 'Pay invoice & complete setup'),
      emailNotice('Once payment is confirmed your listing goes live and guests can start booking.'),
      emailMuted('Questions? Reply to this email or visit our help center.'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\n{{restaurantName}} has been created on Tablevera.\n\nPackage: {{plan}}\nInvoice: {{invoiceNumber}}\nAmount due: {{amount}}\nDue: {{dueDate}}\n\nPay here: {{billingUrl}}\n\nOnce payment is confirmed your listing goes live.',
  },
  {
    key: 'invoice_ready',
    name: 'Invoice ready',
    subject: 'Invoice {{invoiceNumber}} is ready',
    description: 'Sent when a platform invoice is generated.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Your invoice is ready for review.'),
      emailDetailBox([
        { label: 'Invoice', value: '{{invoiceNumber}}' },
        { label: 'Period', value: '{{period}}' },
        { label: 'Amount', value: '{{amount}}' },
      ]),
      emailButton('{{invoiceUrl}}', 'View invoice'),
      emailMuted('If you have questions about this invoice, please contact our billing team.'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nInvoice {{invoiceNumber}} for {{period}} totaling {{amount}} is ready.',
  },
  {
    key: 'docs_access_otp',
    name: 'Docs access verification code',
    subject: 'Your Tablevera docs verification code',
    description: 'One-time code for approved docs.tablevera.online access.',
    bodyHtml: [
      emailParagraph('You requested access to <strong>Tablevera Docs</strong>.'),
      emailParagraph('Enter this verification code on the docs site. It expires in 10 minutes.'),
      emailDetailBox([{ label: 'Verification code', value: '{{code}}' }]),
      emailMuted('If you did not request this code, you can safely ignore this email.'),
    ].join(''),
    bodyText:
      'You requested access to Tablevera Docs.\n\nYour verification code: {{code}}\n\nThis code expires in 10 minutes. If you did not request it, ignore this email.',
  },
] as const;
