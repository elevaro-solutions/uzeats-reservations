import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const shiftSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true },
    slotIntervalMinutes: { type: Number, default: 15 },
    turnTimeMinutes: { type: Number, default: 90 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const blackoutSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    reason: { type: String },
    allDay: { type: Boolean, default: true },
    startTime: { type: String },
    endTime: { type: String },
  },
  { timestamps: true },
);

export type ShiftDocument = InferSchemaType<typeof shiftSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type BlackoutDocument = InferSchemaType<typeof blackoutSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Shift: Model<ShiftDocument> =
  mongoose.models.Shift ?? mongoose.model<ShiftDocument>('Shift', shiftSchema);

export const Blackout: Model<BlackoutDocument> =
  mongoose.models.Blackout ?? mongoose.model<BlackoutDocument>('Blackout', blackoutSchema);
