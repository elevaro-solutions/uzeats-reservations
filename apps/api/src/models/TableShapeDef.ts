import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const tableShapeDefSchema = new Schema(
  {
    /** Stored on Table.shape (e.g. rect, booth, oval). */
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    /** Optional uploaded icon shown in shape pickers. */
    iconUrl: { type: String, default: null },
    /**
     * Canvas silhouette preset (border-radius / overlays).
     * One of the built-in visual keys: rect, round, booth, banquette, high_top, communal, bar.
     */
    renderPreset: { type: String, required: true, default: 'rect' },
    /** Where name/capacity text sits relative to the table on the floor plan. */
    labelPosition: {
      type: String,
      enum: [
        'center',
        'top',
        'bottom',
        'left',
        'right',
        'outside_top',
        'outside_bottom',
        'outside_left',
        'outside_right',
      ],
      default: 'center',
    },
    /** Font-size multiplier for table labels (1 = default). */
    labelFontScale: { type: Number, default: 1, min: 0.6, max: 1.8 },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
    /** Seeded platform defaults — key cannot be changed; rect cannot be deleted. */
    builtin: { type: Boolean, default: false },
  },
  { timestamps: true },
);

tableShapeDefSchema.index({ active: 1, sortOrder: 1, label: 1 });

export type TableShapeDefDocument = InferSchemaType<typeof tableShapeDefSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TableShapeDef: Model<TableShapeDefDocument> =
  mongoose.models.TableShapeDef ??
  mongoose.model<TableShapeDefDocument>('TableShapeDef', tableShapeDefSchema);
