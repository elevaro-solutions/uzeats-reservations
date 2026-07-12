import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

/**
 * Access rules restrict when and how reservations can be made:
 * party-size limits, booking windows, and per-slot cover pacing
 * for a given time range / days of week.
 */
const accessRuleSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    startDate: { type: String }, // YYYY-MM-DD, optional bound
    endDate: { type: String },
    startTime: { type: String }, // HH:mm, optional; whole day if omitted
    endTime: { type: String },
    minPartySize: { type: Number, min: 1 },
    maxPartySize: { type: Number, min: 1 },
    maxCoversPerSlot: { type: Number, min: 0 }, // pacing: 0/undefined = unlimited
    minAdvanceHours: { type: Number, min: 0 }, // must book at least N hours ahead
    maxAdvanceDays: { type: Number, min: 0 }, // can book at most N days ahead
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type AccessRuleDocument = InferSchemaType<typeof accessRuleSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AccessRule: Model<AccessRuleDocument> =
  mongoose.models.AccessRule ??
  mongoose.model<AccessRuleDocument>('AccessRule', accessRuleSchema);
