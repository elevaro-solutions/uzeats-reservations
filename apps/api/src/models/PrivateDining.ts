import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const privateDiningSpaceSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true },
    description: { type: String },
    minGuests: { type: Number, required: true },
    maxGuests: { type: Number, required: true },
    rentalFeeCents: { type: Number, default: 0 },
    minimumSpendCents: { type: Number, default: 0 },
    photoUrl: { type: String },
    amenities: [{ type: String }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

privateDiningSpaceSchema.index({ restaurantId: 1, active: 1 });

export type PrivateDiningSpaceDocument = InferSchemaType<typeof privateDiningSpaceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PrivateDiningSpace: Model<PrivateDiningSpaceDocument> =
  mongoose.models.PrivateDiningSpace ??
  mongoose.model<PrivateDiningSpaceDocument>('PrivateDiningSpace', privateDiningSpaceSchema);

const privateDiningInquirySchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    spaceId: { type: Schema.Types.ObjectId, ref: 'PrivateDiningSpace' },
    dinerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventDate: { type: Date, required: true },
    guestCount: { type: Number, required: true },
    eventType: {
      type: String,
      enum: ['corporate', 'wedding', 'birthday', 'holiday', 'other'],
      required: true,
    },
    budget: { type: String },
    specialRequests: { type: String },
    contactPhone: { type: String },
    status: {
      type: String,
      enum: ['pending', 'responded', 'confirmed', 'declined', 'cancelled'],
      default: 'pending',
    },
    restaurantResponse: { type: String },
  },
  { timestamps: true },
);

privateDiningInquirySchema.index({ restaurantId: 1, status: 1 });
privateDiningInquirySchema.index({ dinerId: 1 });

export type PrivateDiningInquiryDocument = InferSchemaType<typeof privateDiningInquirySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PrivateDiningInquiry: Model<PrivateDiningInquiryDocument> =
  mongoose.models.PrivateDiningInquiry ??
  mongoose.model<PrivateDiningInquiryDocument>('PrivateDiningInquiry', privateDiningInquirySchema);
