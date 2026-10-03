import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const waitlistSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    // Optional for in-house (walk-in/phone) entries added by managers
    dinerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    guestName: { type: String },
    guestPhone: { type: String },
    source: { type: String, enum: ['online', 'in_house'], default: 'online' },
    quotedWaitMinutes: { type: Number },
    partySize: { type: Number, required: true },
    preferredDate: { type: String, required: true },
    preferredTimeStart: { type: String },
    preferredTimeEnd: { type: String },
    status: {
      type: String,
      enum: ['waiting', 'notified', 'booked', 'seated', 'expired', 'cancelled'],
      default: 'waiting',
      index: true,
    },
    notifiedAt: { type: Date },
    notifiedSlot: { type: Date },
    /** Last time hosts were alerted that this party's wait is overdue. */
    overdueNotifiedAt: { type: Date },
    /** Set when converted to a reservation (booked) or seated as walk-in. */
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation' },
  },
  { timestamps: true },
);

waitlistSchema.index({ status: 1, notifiedAt: 1 });
waitlistSchema.index({ status: 1, createdAt: 1, overdueNotifiedAt: 1 });
waitlistSchema.index({ restaurantId: 1, preferredDate: 1, status: 1, createdAt: 1 });

export type WaitlistDocument = InferSchemaType<typeof waitlistSchema> &
  mongoose.Document & {
    _id: mongoose.Types.ObjectId;
  };

export const WaitlistEntry: Model<WaitlistDocument> =
  mongoose.models.WaitlistEntry ??
  mongoose.model<WaitlistDocument>('WaitlistEntry', waitlistSchema);
