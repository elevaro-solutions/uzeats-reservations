import { z } from 'zod';
import {
  USER_ROLES,
  RESTAURANT_STATUSES,
  RESERVATION_STATUSES,
  OCCASIONS,
  PRICE_RANGES,
  CUISINES,
  WAITLIST_STATUSES,
} from './constants.js';

export const emailSchema = z.string().email().toLowerCase();
export const passwordSchema = z.string().min(8).max(128);
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{7,14}$/);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: phoneSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const phoneOtpRequestSchema = z.object({
  phone: phoneSchema,
});

export const phoneOtpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().min(4).max(8),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
});

export const restaurantInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  cuisine: z.enum(CUISINES),
  priceRange: z.number().int().min(1).max(4) as z.ZodType<(typeof PRICE_RANGES)[number]>,
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(2).max(2),
    zip: z.string().min(5).max(10),
    country: z.string().default('US'),
  }),
  location: z.object({
    lng: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90),
  }),
  phone: phoneSchema.optional(),
  website: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v == null ? undefined : v)),
  depositRequired: z.boolean().default(false),
  depositAmountCents: z.number().int().min(0).default(0),
  photos: z.array(z.string().url()).default([]),
});

/** Partner signup: account + restaurant listing + selected plan. */
export const registerRestaurantPartnerSchema = z.object({
  account: registerSchema.extend({
    phone: phoneSchema,
  }),
  restaurant: restaurantInputSchema.extend({
    phone: phoneSchema,
    description: z.string().min(1).max(2000),
  }),
  plan: z.string().min(1).max(40),
});

export const tableInputSchema = z.object({
  name: z.string().min(1).max(40),
  minCapacity: z.number().int().min(1).max(50),
  maxCapacity: z.number().int().min(1).max(50),
  floorArea: z.string().max(60).default('Main'),
  combinable: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const shiftInputSchema = z.object({
  name: z.string().min(1).max(60),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotIntervalMinutes: z.number().int().min(5).max(60).default(15),
  turnTimeMinutes: z.number().int().min(30).max(240).default(90),
  active: z.boolean().default(true),
});

export const reservationInputSchema = z.object({
  restaurantId: z.string().min(1),
  partySize: z.number().int().min(1).max(50),
  slotStart: z.string().datetime(),
  occasion: z.enum(OCCASIONS).default('none'),
  guestNotes: z.string().max(500).optional(),
  redeemPoints: z.number().int().min(0).optional(),
});

export const ownerGuestInputSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional().default(''),
  phone: z.string().min(7).max(20).optional(),
  email: z.string().email().toLowerCase().optional(),
});

export const ownerReservationInputSchema = z.object({
  restaurantId: z.string().min(1),
  partySize: z.number().int().min(1).max(50),
  slotStart: z.string().datetime(),
  occasion: z.enum(OCCASIONS).default('none'),
  guestNotes: z.string().max(500).optional(),
  source: z.enum(['phone', 'walkin']).default('phone'),
  guest: ownerGuestInputSchema,
  tableId: z.string().min(1).optional(),
  seatImmediately: z.boolean().optional().default(false),
});

export const updateReservationInputSchema = z.object({
  partySize: z.number().int().min(1).max(50).optional(),
  slotStart: z.string().datetime().optional(),
  occasion: z.enum(OCCASIONS).optional(),
  guestNotes: z.string().max(500).optional(),
  tableId: z.string().min(1).optional(),
});

export const waitlistInputSchema = z.object({
  restaurantId: z.string().min(1),
  partySize: z.number().int().min(1).max(50),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTimeStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  preferredTimeEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export const reviewInputSchema = z.object({
  reservationId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const notificationChannelPreferencesSchema = z.object({
  sms: z.boolean().nullish(),
  email: z.boolean().nullish(),
  webPush: z.boolean().nullish(),
  platform: z.boolean().nullish(),
});

export const notificationPreferencesSchema = z.object({
  newMessage: notificationChannelPreferencesSchema.nullish(),
  newReservation: notificationChannelPreferencesSchema.nullish(),
  waitlistAvailable: notificationChannelPreferencesSchema.nullish(),
  guestSpendAlert: notificationChannelPreferencesSchema.nullish(),
  reservationUpdates: notificationChannelPreferencesSchema.nullish(),
  reviewReply: notificationChannelPreferencesSchema.nullish(),
  surveyInvitation: notificationChannelPreferencesSchema.nullish(),
});

export const searchRestaurantsSchema = z.object({
  query: z.string().optional(),
  cuisine: z.enum(CUISINES).optional(),
  priceRange: z.number().int().min(1).max(4).optional(),
  city: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radiusKm: z.number().min(0.5).max(100).default(25),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  partySize: z.number().int().min(1).max(50).default(2),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RestaurantInput = z.infer<typeof restaurantInputSchema>;
export type RegisterRestaurantPartnerInput = z.infer<typeof registerRestaurantPartnerSchema>;
export type TableInput = z.infer<typeof tableInputSchema>;
export type ShiftInput = z.infer<typeof shiftInputSchema>;
export type ReservationInput = z.infer<typeof reservationInputSchema>;
export type OwnerReservationInput = z.infer<typeof ownerReservationInputSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationInputSchema>;
export type WaitlistInput = z.infer<typeof waitlistInputSchema>;
export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
export type SearchRestaurantsInput = z.infer<typeof searchRestaurantsSchema>;

export {
  USER_ROLES,
  RESTAURANT_STATUSES,
  RESERVATION_STATUSES,
  OCCASIONS,
  PRICE_RANGES,
  CUISINES,
  WAITLIST_STATUSES,
};
