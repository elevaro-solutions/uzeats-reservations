import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

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
    bodyHtml:
      '<p>Hi {{firstName}},</p><p>Use this link to reset your password:</p><p><a href="{{resetUrl}}">{{resetUrl}}</a></p><p>This link expires in 1 hour.</p>',
    bodyText:
      'Hi {{firstName}},\n\nUse this link to reset your password:\n{{resetUrl}}\n\nThis link expires in 1 hour.',
  },
  {
    key: 'booking_confirmation',
    name: 'Booking confirmation',
    subject: 'Reservation confirmed at {{restaurantName}}',
    description: 'Sent after a diner books successfully.',
    bodyHtml:
      '<p>Hi {{firstName}},</p><p>Your reservation at <strong>{{restaurantName}}</strong> on {{date}} for {{partySize}} is confirmed.</p>',
    bodyText:
      'Hi {{firstName}},\n\nYour reservation at {{restaurantName}} on {{date}} for {{partySize}} is confirmed.',
  },
  {
    key: 'booking_reminder',
    name: 'Booking reminder',
    subject: 'Reminder: {{restaurantName}} tomorrow',
    description: 'Pre-visit reminder.',
    bodyHtml:
      '<p>Hi {{firstName}},</p><p>Reminder: you have a reservation at {{restaurantName}} on {{date}}.</p>',
    bodyText:
      'Hi {{firstName}},\n\nReminder: you have a reservation at {{restaurantName}} on {{date}}.',
  },
  {
    key: 'booking_cancelled',
    name: 'Booking cancelled',
    subject: 'Reservation cancelled — {{restaurantName}}',
    description: 'Sent when a booking is cancelled.',
    bodyHtml:
      '<p>Hi {{firstName}},</p><p>Your reservation at {{restaurantName}} on {{date}} was cancelled.</p>',
    bodyText:
      'Hi {{firstName}},\n\nYour reservation at {{restaurantName}} on {{date}} was cancelled.',
  },
  {
    key: 'waitlist_available',
    name: 'Waitlist available',
    subject: 'A table opened up at {{restaurantName}}',
    description: 'Waitlist availability notification.',
    bodyHtml:
      '<p>Hi {{firstName}},</p><p>A table is available at {{restaurantName}}. Book soon before it fills again.</p>',
    bodyText:
      'Hi {{firstName}},\n\nA table is available at {{restaurantName}}. Book soon before it fills again.',
  },
  {
    key: 'staff_invite',
    name: 'Staff invite',
    subject: 'You are invited to {{restaurantName}} on Tablevera',
    description: 'Sent when an admin or owner invites staff.',
    bodyHtml:
      '<p>Hi {{firstName}},</p><p>You have been invited to manage {{restaurantName}} as {{role}}.</p><p><a href="{{inviteUrl}}">Accept invite</a></p>',
    bodyText:
      'Hi {{firstName}},\n\nYou have been invited to manage {{restaurantName}} as {{role}}.\n{{inviteUrl}}',
  },
  {
    key: 'restaurant_approved',
    name: 'Restaurant approved',
    subject: '{{restaurantName}} is live on Tablevera',
    description: 'Sent when a restaurant listing is approved.',
    bodyHtml:
      '<p>Hi {{firstName}},</p><p>{{restaurantName}} has been approved and is now visible to diners.</p>',
    bodyText:
      'Hi {{firstName}},\n\n{{restaurantName}} has been approved and is now visible to diners.',
  },
  {
    key: 'invoice_ready',
    name: 'Invoice ready',
    subject: 'Invoice {{invoiceNumber}} is ready',
    description: 'Sent when a platform invoice is generated.',
    bodyHtml:
      '<p>Hi {{firstName}},</p><p>Invoice {{invoiceNumber}} for {{period}} totaling {{amount}} is ready.</p>',
    bodyText:
      'Hi {{firstName}},\n\nInvoice {{invoiceNumber}} for {{period}} totaling {{amount}} is ready.',
  },
] as const;
