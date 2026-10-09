import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const tableSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    minCapacity: { type: Number, required: true, min: 1 },
    maxCapacity: { type: Number, required: true, min: 1 },
    floorArea: { type: String, default: 'Main' },
    combinable: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    // Visual floor plan editor coordinates (grid units)
    posX: { type: Number, default: 0 },
    posY: { type: Number, default: 0 },
    width: { type: Number, default: 2 },
    height: { type: Number, default: 2 },
    /** Shape key from TableShapeDef (built-in or custom). */
    shape: { type: String, default: 'rect', trim: true, lowercase: true },
    /** Visual rotation in degrees (0–360), applied around the table center. */
    rotation: { type: Number, default: 0 },
    /** Shared id when this table is visually/joined with others for party seating. */
    combineGroupId: { type: String, default: null },
    photoUrl: { type: String },
    /** When true, bookings assigned to this table need staff confirmation. */
    requiresManualApproval: { type: Boolean, default: false },
    /**
     * Backing inventory for a PrivateDiningSpace. Excluded from regular
     * availability unless that private room is selected.
     */
    privateDiningOnly: { type: Boolean, default: false },
    /** When true with a positive amount, overrides the restaurant's per-guest deposit. */
    depositRequired: { type: Boolean, default: false },
    depositAmountCents: { type: Number, default: 0, min: 0 },
    /** Hours before slot start when free cancel ends. Null inherits restaurant/platform. */
    cancellationPeriodHours: { type: Number, min: 1, max: 720, default: null },
    /** When false, guests cannot pick this table in the 3D room. Default true. */
    virtualRoomSelectable: { type: Boolean, default: true },
    /**
     * When the restaurant's 3D fee applyTo is `selected`, only tables with this
     * flag incur the fee. When applyTo is `all`, set false to opt out.
     */
    virtualRoomSelectionFeeEnabled: { type: Boolean, default: false },
    /** Per-table unit fee override in cents; unset inherits area/restaurant/platform. */
    virtualRoomSelectionFeeCents: { type: Number, min: 0 },
  },
  { timestamps: true },
);

tableSchema.index({ restaurantId: 1, name: 1 }, { unique: true });
tableSchema.index({ restaurantId: 1, combineGroupId: 1 });

export type TableDocument = InferSchemaType<typeof tableSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Table: Model<TableDocument> =
  mongoose.models.Table ?? mongoose.model<TableDocument>('Table', tableSchema);
