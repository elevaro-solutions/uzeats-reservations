import mongoose, { Schema, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';
import {
  VIRTUAL_ROOM_AREA_LAYOUT_MODES,
  VIRTUAL_ROOM_DEFAULT_AREA_LAYOUT_MODE,
  VIRTUAL_ROOM_MEDIA_KINDS,
  VIRTUAL_ROOM_MEDIA_ROLES,
  VIRTUAL_ROOM_RECONSTRUCTION_STATUSES,
} from '@reservations/shared';

const mediaSchema = new Schema(
  {
    id: { type: String, required: true },
    kind: { type: String, enum: VIRTUAL_ROOM_MEDIA_KINDS, required: true },
    role: { type: String, enum: VIRTUAL_ROOM_MEDIA_ROLES, required: true },
    url: { type: String, required: true },
    /** Unset = applies to every area. */
    floorArea: { type: String },
    caption: { type: String },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const areaSettingsSchema = new Schema(
  {
    floorArea: { type: String, required: true },
    wallHeightM: { type: Number },
    panoramaMediaId: { type: String },
    wallColor: { type: String },
    floorColor: { type: String },
    /** World-space meters for overall multi-area view (X sideways, Y stack, Z depth). */
    offsetXM: { type: Number, default: 0 },
    offsetYM: { type: Number, default: 0 },
    offsetZM: { type: Number, default: 0 },
    guestSelectable: { type: Boolean, default: true },
    selectionFeeCharged: { type: Boolean, default: true },
    selectionFeeCents: { type: Number, min: 0 },
  },
  { _id: false },
);

const reconstructionSchema = new Schema(
  {
    status: {
      type: String,
      enum: VIRTUAL_ROOM_RECONSTRUCTION_STATUSES,
      default: 'idle',
    },
    provider: { type: String },
    jobId: { type: String },
    sourceKind: { type: String, enum: VIRTUAL_ROOM_MEDIA_KINDS },
    sourceCount: { type: Number },
    /** GLB re-hosted on our storage once the provider finishes. */
    modelUrl: { type: String },
    error: { type: String },
    requestedAt: { type: Date },
    completedAt: { type: Date },
    pollCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const virtualRoomSchema = new Schema(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
    },
    /** Diners only see the room when published and the add-on is active. */
    published: { type: Boolean, default: false },
    publishedAt: { type: Date },
    media: { type: [mediaSchema], default: [] },
    areaSettings: { type: [areaSettingsSchema], default: [] },
    /** How areas are arranged in the overall 3D view (stack / side-by-side / custom offsets). */
    areaLayoutMode: {
      type: String,
      enum: VIRTUAL_ROOM_AREA_LAYOUT_MODES,
      default: VIRTUAL_ROOM_DEFAULT_AREA_LAYOUT_MODE,
    },
    useReconstructedModel: { type: Boolean, default: true },
    /** Multiplies the auto-fit of the scanned model onto the floor-plan bounds. */
    modelTransform: {
      scale: { type: Number, default: 1 },
      rotationDeg: { type: Number, default: 0 },
      offsetXM: { type: Number, default: 0 },
      offsetZM: { type: Number, default: 0 },
    },
    reconstruction: { type: reconstructionSchema, default: () => ({ status: 'idle' }) },
  },
  { timestamps: true },
);

type VirtualRoomFields = InferSchemaType<typeof virtualRoomSchema>;

export type VirtualRoomDocument = HydratedDocument<VirtualRoomFields>;

export const VirtualRoom: Model<VirtualRoomFields> =
  mongoose.models.VirtualRoom ??
  mongoose.model<VirtualRoomFields>('VirtualRoom', virtualRoomSchema);
