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
    shape: { type: String, enum: ['rect', 'round'], default: 'rect' },
  },
  { timestamps: true },
);

tableSchema.index({ restaurantId: 1, name: 1 }, { unique: true });

export type TableDocument = InferSchemaType<typeof tableSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Table: Model<TableDocument> =
  mongoose.models.Table ?? mongoose.model<TableDocument>('Table', tableSchema);
