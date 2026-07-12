import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const menuItemSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    priceCents: { type: Number, required: true, min: 0 },
    photoUrl: { type: String },
    dietary: [{ type: String }],
    available: { type: Boolean, default: true },
  },
  { _id: true },
);

const menuSectionSchema = new Schema(
  {
    name: { type: String, required: true },
    items: { type: [menuItemSchema], default: [] },
  },
  { _id: true },
);

const menuSchema = new Schema(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
    },
    sections: { type: [menuSectionSchema], default: [] },
  },
  { timestamps: true },
);

export type MenuDocument = InferSchemaType<typeof menuSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Menu: Model<MenuDocument> =
  mongoose.models.Menu ?? mongoose.model<MenuDocument>('Menu', menuSchema);
