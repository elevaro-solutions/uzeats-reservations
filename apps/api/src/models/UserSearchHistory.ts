import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const userSearchHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dedupeKey: { type: String, required: true },
    label: { type: String, required: true },
    query: { type: String },
    cuisine: { type: String },
    diningStyles: { type: [String], default: [] },
    occasions: { type: [String], default: [] },
    meals: { type: [String], default: [] },
    dietaryTags: { type: [String], default: [] },
    amenities: { type: [String], default: [] },
    city: { type: String },
    state: { type: String },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    searchedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
);

userSearchHistorySchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
userSearchHistorySchema.index({ userId: 1, searchedAt: -1 });

export type UserSearchHistoryDocument = InferSchemaType<typeof userSearchHistorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserSearchHistory: Model<UserSearchHistoryDocument> =
  mongoose.models.UserSearchHistory ??
  mongoose.model<UserSearchHistoryDocument>('UserSearchHistory', userSearchHistorySchema);
