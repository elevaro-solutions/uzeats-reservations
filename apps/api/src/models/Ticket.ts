import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const ticketSchema = new Schema(
  {
    experienceId: { type: Schema.Types.ObjectId, ref: 'Experience', required: true },
    dinerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true, min: 1 },
    totalPriceCents: { type: Number, required: true },
    stripePaymentIntentId: { type: String },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    confirmationCode: { type: String },
  },
  { timestamps: true },
);

ticketSchema.index({ experienceId: 1 });
ticketSchema.index({ dinerId: 1 });

export type TicketDocument = InferSchemaType<typeof ticketSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Ticket: Model<TicketDocument> =
  mongoose.models.Ticket ??
  mongoose.model<TicketDocument>('Ticket', ticketSchema);
