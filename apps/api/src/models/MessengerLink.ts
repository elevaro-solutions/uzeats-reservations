import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

export const MESSENGER_CHANNELS = ['TELEGRAM', 'WHATSAPP'] as const;
export type MessengerChannel = (typeof MESSENGER_CHANNELS)[number];

export const MESSENGER_BOT_PROFILES = ['FOH', 'HOST', 'APPROVER'] as const;
export type MessengerBotProfile = (typeof MESSENGER_BOT_PROFILES)[number];

export const MESSENGER_BOT_ACTIONS = [
  'accept',
  'reject',
  'cancel',
  'seat',
  'complete',
  'no_show',
] as const;
export type MessengerBotActionCode = (typeof MESSENGER_BOT_ACTIONS)[number];

/** A messenger chat bound to a Tablevera user for one restaurant. */
const messengerLinkSchema = new Schema(
  {
    channel: { type: String, enum: MESSENGER_CHANNELS, required: true },
    /** Telegram chat id. For private chats this equals the Telegram user id. */
    chatId: { type: String, required: true, maxlength: 64 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    displayName: { type: String, default: null, maxlength: 128 },
    label: { type: String, default: null, maxlength: 64 },
    profileOverride: {
      type: String,
      enum: MESSENGER_BOT_PROFILES,
      default: null,
    },
    allowedActions: {
      type: [{ type: String, enum: MESSENGER_BOT_ACTIONS }],
      default: null,
    },
    paused: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    linkedAt: { type: Date, default: () => new Date() },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messengerLinkSchema.index({ channel: 1, chatId: 1, restaurantId: 1 }, { unique: true });
messengerLinkSchema.index({ restaurantId: 1, isActive: 1 });
messengerLinkSchema.index({ userId: 1, restaurantId: 1, isActive: 1 });

export type MessengerLinkDocument = InferSchemaType<typeof messengerLinkSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const MessengerLink: Model<MessengerLinkDocument> =
  mongoose.models.MessengerLink ??
  mongoose.model<MessengerLinkDocument>('MessengerLink', messengerLinkSchema);
