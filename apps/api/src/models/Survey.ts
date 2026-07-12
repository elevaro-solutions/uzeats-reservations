import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const surveyResponseSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true },
    dinerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    overallRating: { type: Number, min: 1, max: 5 },
    foodRating: { type: Number, min: 1, max: 5 },
    serviceRating: { type: Number, min: 1, max: 5 },
    ambienceRating: { type: Number, min: 1, max: 5 },
    valueRating: { type: Number, min: 1, max: 5 },
    wouldRecommend: { type: Boolean },
    feedback: { type: String },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

surveyResponseSchema.index({ restaurantId: 1, reservationId: 1 }, { unique: true });

export type SurveyResponseDocument = InferSchemaType<typeof surveyResponseSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SurveyResponse: Model<SurveyResponseDocument> =
  mongoose.models.SurveyResponse ??
  mongoose.model<SurveyResponseDocument>('SurveyResponse', surveyResponseSchema);

const surveyConfigSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, unique: true },
    enabled: { type: Boolean, default: false },
    includeFood: { type: Boolean, default: true },
    includeService: { type: Boolean, default: true },
    includeAmbience: { type: Boolean, default: true },
    includeValue: { type: Boolean, default: true },
    includeRecommend: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type SurveyConfigDocument = InferSchemaType<typeof surveyConfigSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SurveyConfig: Model<SurveyConfigDocument> =
  mongoose.models.SurveyConfig ??
  mongoose.model<SurveyConfigDocument>('SurveyConfig', surveyConfigSchema);
