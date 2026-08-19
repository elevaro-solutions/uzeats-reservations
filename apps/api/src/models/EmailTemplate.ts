import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import {
  emailButton,
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
        'booking_confirmation',
        'booking_reminder',
        'booking_cancelled',
        'waitlist_available',
        'staff_invite',
        'restaurant_approved',
        'restaurant_created',
        'invoice_ready',
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
    key: 'booking_confirmation',
    name: 'Booking confirmation',
    subject: 'Reservation confirmed at {{restaurantName}}',
    description: 'Sent after a diner books successfully.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Great news — your reservation is confirmed. We look forward to seeing you.'),
      emailDetailBox([
        { label: 'Restaurant', value: '{{restaurantName}}' },
        { label: 'Date & time', value: '{{date}}' },
        { label: 'Party size', value: '{{partySize}}' },
      ]),
      emailMuted('Need to make changes? Visit your reservations in the Tablevera app.'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nYour reservation at {{restaurantName}} on {{date}} for {{partySize}} is confirmed.',
  },
  {
    key: 'booking_reminder',
    name: 'Booking reminder',
    subject: 'Reminder: {{restaurantName}} tomorrow',
    description: 'Pre-visit reminder.',
    bodyHtml: [
      emailGreeting('{{firstName}}'),
      emailParagraph('Just a friendly reminder about your upcoming reservation.'),
      emailDetailBox([
        { label: 'Restaurant', value: '{{restaurantName}}' },
        { label: 'Date & time', value: '{{date}}' },
      ]),
      emailMuted('We hope you have a wonderful dining experience.'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nReminder: you have a reservation at {{restaurantName}} on {{date}}.',
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
      ]),
      emailMuted('If you didn\'t request this cancellation or have questions, please contact the restaurant directly.'),
    ].join(''),
    bodyText:
      'Hi {{firstName}},\n\nYour reservation at {{restaurantName}} on {{date}} was cancelled.',
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
    name: 'Staff invite',
    subject: 'You are invited to {{restaurantName}} on Tablevera',
    description: 'Sent when an admin or owner invites staff.',
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
    name: 'Restaurant created — onboarding & invoice',
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
] as const;
