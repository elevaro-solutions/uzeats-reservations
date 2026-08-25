import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

export const DISCOVERY_TAXONOMY_KINDS = [
  'category',
  'cuisine',
  'occasion',
  'landmark',
] as const;

export type DiscoveryTaxonomyKind = (typeof DISCOVERY_TAXONOMY_KINDS)[number];

const discoveryTaxonomySchema = new Schema(
  {
    kind: {
      type: String,
      enum: DISCOVERY_TAXONOMY_KINDS,
      required: true,
      index: true,
    },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    iconUrl: { type: String, default: '' },
    sortOrder: { type: Number, default: 0, index: true },
    active: { type: Boolean, default: true, index: true },
    /** Category: optional cuisine match against Restaurant.cuisine */
    cuisine: { type: String, default: '' },
    /** Category: optional text search preset */
    query: { type: String, default: '' },
    /** Landmark location */
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    lat: { type: Number },
    lng: { type: Number },
  },
  { timestamps: true },
);

discoveryTaxonomySchema.index({ kind: 1, slug: 1 }, { unique: true });
discoveryTaxonomySchema.index({ kind: 1, active: 1, sortOrder: 1, label: 1 });
discoveryTaxonomySchema.index({ label: 'text', description: 'text', slug: 'text' });

export type DiscoveryTaxonomyDocument = InferSchemaType<typeof discoveryTaxonomySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DiscoveryTaxonomy: Model<DiscoveryTaxonomyDocument> =
  mongoose.models.DiscoveryTaxonomy ??
  mongoose.model<DiscoveryTaxonomyDocument>('DiscoveryTaxonomy', discoveryTaxonomySchema);
