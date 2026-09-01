import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const searchEventSchema = new Schema(
  {
    term: { type: String, required: true, index: true },
    kind: {
      type: String,
      enum: ['QUERY', 'CUISINE', 'OCCASION', 'MEAL', 'DINING_STYLE', 'DIETARY', 'AMENITY'],
      required: true,
      index: true,
    },
    city: { type: String, index: true },
    state: { type: String, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

searchEventSchema.index({ city: 1, state: 1, kind: 1, term: 1, createdAt: -1 });
searchEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export type SearchEventDocument = InferSchemaType<typeof searchEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SearchEvent: Model<SearchEventDocument> =
  mongoose.models.SearchEvent ??
  mongoose.model<SearchEventDocument>('SearchEvent', searchEventSchema);
