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
import {
  AMENITIES,
  DIETARY_TAGS,
  DINING_STYLES,
  DISCOVERY_OCCASIONS,
  MEALS,
} from './discovery.js';

export const emailSchema = z.string().email().toLowerCase();
export const passwordSchema = z.string().min(8).max(128);
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{7,14}$/);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: phoneSchema.optional(),
  referralCode: z.string().min(4).max(20).optional(),
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

export const adminCreateOwnerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: phoneSchema.optional(),
});

export const restaurantFaqItemSchema = z.object({
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(2000),
});

export const restaurantFeaturedInItemSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  url: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v == null ? undefined : v)),
  logoUrl: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v == null ? undefined : v)),
});

export const restaurantInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  cuisine: z
    .string()
    .min(2)
    .max(60)
    .trim()
    .refine((v) => v.length > 0, 'Cuisine is required'),
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
  menuUrl: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v == null ? undefined : v)),
  depositRequired: z.boolean().default(false),
  depositAmountCents: z.number().int().min(0).default(0),
  loyaltyEnabled: z.boolean().default(false),
  loyaltyPointsPerVisit: z.number().int().min(0).default(50),
  loyaltyMinRedeemPoints: z.number().int().min(0).default(200),
  photos: z.array(z.string().url()).default([]),
  neighborhood: z.string().max(80).optional(),
  diningStyles: z.array(z.enum(DINING_STYLES)).default([]),
  discoveryOccasions: z.array(z.enum(DISCOVERY_OCCASIONS)).default([]),
  meals: z.array(z.enum(MEALS)).default([]),
  dietaryTags: z.array(z.enum(DIETARY_TAGS)).default([]),
  amenities: z.array(z.enum(AMENITIES)).default([]),
  wheelchairAccessible: z.boolean().default(false),
  faq: z.array(restaurantFaqItemSchema).default([]),
  featuredIn: z.array(restaurantFeaturedInItemSchema).default([]),
  termsAndConditions: z.string().max(8000).optional(),
});

export const restaurantInquiryInputSchema = z.object({
  restaurantId: z.string().min(1),
  message: z.string().min(1).max(2000),
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
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
  photoUrl: z.string().url().optional().nullable(),
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
  redeemRestaurantPoints: z.number().int().min(0).optional(),
  promoCode: z.string().min(1).max(40).optional(),
  giftCardCode: z.string().min(1).max(40).optional(),
  tableId: z.string().min(1).optional(),
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
  loyaltyUpdates: notificationChannelPreferencesSchema.nullish(),
});

export const searchRestaurantsSchema = z.object({
  query: z.string().optional(),
  cuisine: z.enum(CUISINES).optional(),
  cuisines: z.array(z.enum(CUISINES)).optional(),
  categoryIds: z.array(z.string()).optional(),
  priceRange: z.number().int().min(1).max(4).optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radiusKm: z.number().min(0.5).max(100).default(25),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  partySize: z.number().int().min(1).max(50).default(2),
  occasions: z.array(z.enum(DISCOVERY_OCCASIONS)).optional(),
  diningStyles: z.array(z.enum(DINING_STYLES)).optional(),
  meals: z.array(z.enum(MEALS)).optional(),
  dietaryTags: z.array(z.enum(DIETARY_TAGS)).optional(),
  amenities: z.array(z.enum(AMENITIES)).optional(),
  minRating: z.number().min(0).max(5).optional(),
  wheelchairAccessible: z.boolean().optional(),
  requireAvailability: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RestaurantInput = z.infer<typeof restaurantInputSchema>;
export type RestaurantInquiryInput = z.infer<typeof restaurantInquiryInputSchema>;
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

export const CONTACT_FORM_TOPICS = [
  'general',
  'restaurant',
  'support',
  'privacy',
  'legal',
] as const;

export const contactFormInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  topic: z.enum(CONTACT_FORM_TOPICS),
  message: z.string().trim().min(10).max(5000),
});

export type ContactFormInput = z.infer<typeof contactFormInputSchema>;

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeStringSchema = z.string().regex(/^\d{2}:\d{2}$/);

export const accessRuleInputSchema = z.object({
  name: z.string().min(1).max(120),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  startTime: timeStringSchema.optional(),
  endTime: timeStringSchema.optional(),
  minPartySize: z.number().int().min(1).max(50).optional(),
  maxPartySize: z.number().int().min(1).max(50).optional(),
  maxCoversPerSlot: z.number().int().min(0).optional(),
  minAdvanceHours: z.number().int().min(0).optional(),
  maxAdvanceDays: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const promotionInputSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  discountAmountCents: z.number().int().min(0).optional(),
  code: z.string().min(1).max(40).optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  maxRedemptions: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const inHouseWaitlistInputSchema = z.object({
  restaurantId: z.string().min(1),
  guestName: z.string().min(1).max(120),
  guestPhone: z.string().min(7).max(20).optional(),
  partySize: z.number().int().min(1).max(50),
  quotedWaitMinutes: z.number().int().min(0).max(480).optional(),
});

export const createBlackoutInputSchema = z.object({
  restaurantId: z.string().min(1),
  date: dateStringSchema,
  reason: z.string().max(500).optional().nullable(),
  allDay: z.boolean().optional(),
});

export type AccessRuleInput = z.infer<typeof accessRuleInputSchema>;
export type PromotionInput = z.infer<typeof promotionInputSchema>;
export type InHouseWaitlistInput = z.infer<typeof inHouseWaitlistInputSchema>;
export type CreateBlackoutInput = z.infer<typeof createBlackoutInputSchema>;

export {
  USER_ROLES,
  RESTAURANT_STATUSES,
  RESERVATION_STATUSES,
  OCCASIONS,
  PRICE_RANGES,
  CUISINES,
  WAITLIST_STATUSES,
};
