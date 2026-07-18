import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

/** 15-minute quanta used to serialize overlapping table bookings without transactions. */
export const SLOT_QUANTUM_MS = 15 * 60_000;

const tableSlotClaimSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true, index: true },
    /** ISO timestamp of the quantum start (UTC). */
    slotKey: { type: String, required: true },
  },
  { timestamps: true },
);

tableSlotClaimSchema.index({ tableId: 1, slotKey: 1 }, { unique: true });

export type TableSlotClaimDocument = InferSchemaType<typeof tableSlotClaimSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TableSlotClaim: Model<TableSlotClaimDocument> =
  mongoose.models.TableSlotClaim ??
  mongoose.model<TableSlotClaimDocument>('TableSlotClaim', tableSlotClaimSchema);
