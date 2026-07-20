import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_EVENT_TYPES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  SUPPORT_TICKET_SUBJECTS,
} from '@reservations/shared';

const subjectKeys = SUPPORT_TICKET_SUBJECTS.map((s) => s.key);

const supportNoteSchema = new Schema(
  {
    body: { type: String, required: true, maxlength: 5000 },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { _id: true },
);

const supportAttachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    key: { type: String },
    filename: { type: String, required: true, maxlength: 255 },
    contentType: { type: String, required: true, maxlength: 120 },
    size: { type: Number, min: 0 },
    uploadedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const supportEventSchema = new Schema(
  {
    type: {
      type: String,
      enum: SUPPORT_TICKET_EVENT_TYPES,
      required: true,
    },
    field: { type: String, maxlength: 60 },
    from: { type: String, maxlength: 500 },
    to: { type: String, maxlength: 500 },
    message: { type: String, maxlength: 1000 },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const supportTicketSchema = new Schema(
  {
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    subjectKey: {
      type: String,
      enum: subjectKeys,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 5000, default: '' },
    status: {
      type: String,
      enum: SUPPORT_TICKET_STATUSES,
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: SUPPORT_TICKET_PRIORITIES,
      default: 'normal',
    },
    category: {
      type: String,
      enum: SUPPORT_TICKET_CATEGORIES,
      default: 'other',
    },
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', index: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    notes: { type: [supportNoteSchema], default: [] },
    attachments: { type: [supportAttachmentSchema], default: [] },
    events: { type: [supportEventSchema], default: [] },
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

supportTicketSchema.index({ status: 1, updatedAt: -1 });

export type SupportTicketDocument = InferSchemaType<typeof supportTicketSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SupportTicket: Model<SupportTicketDocument> =
  mongoose.models.SupportTicket ??
  mongoose.model<SupportTicketDocument>('SupportTicket', supportTicketSchema);
