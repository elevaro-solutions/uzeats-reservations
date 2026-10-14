import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

/**
 * Per-date schedule for a restaurant: close the day or replace weekly shifts
 * with custom open hours (holidays / special days).
 */
const dateScheduleOverrideSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    mode: { type: String, enum: ['closed', 'custom_hours'], required: true },
    startTime: { type: String }, // HH:mm when custom_hours
    endTime: { type: String },
    reason: { type: String },
    source: {
      type: String,
      enum: ['manual', 'platform_holiday'],
      default: 'manual',
    },
    holidayKey: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
    requestedById: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedById: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

dateScheduleOverrideSchema.index({ restaurantId: 1, date: 1 }, { unique: true });

export type DateScheduleOverrideDocument = InferSchemaType<typeof dateScheduleOverrideSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DateScheduleOverride: Model<DateScheduleOverrideDocument> =
  mongoose.models.DateScheduleOverride ??
  mongoose.model<DateScheduleOverrideDocument>('DateScheduleOverride', dateScheduleOverrideSchema);
