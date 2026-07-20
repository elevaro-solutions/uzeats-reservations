import type {
  USER_ROLES,
  RESTAURANT_STATUSES,
  RESERVATION_STATUSES,
  OCCASIONS,
  PRICE_RANGES,
  CUISINES,
  WAITLIST_STATUSES,
  SUPPORT_TICKET_STATUSES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_SUBJECTS,
  SUPPORT_TICKET_EVENT_TYPES,
} from './constants.js';

export type UserRole = (typeof USER_ROLES)[number];
export type RestaurantStatus = (typeof RESTAURANT_STATUSES)[number];
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];
export type Occasion = (typeof OCCASIONS)[number];
export type PriceRange = (typeof PRICE_RANGES)[number];
export type Cuisine = (typeof CUISINES)[number];
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];
export type SupportTicketPriority = (typeof SUPPORT_TICKET_PRIORITIES)[number];
export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];
export type SupportTicketSubjectKey = (typeof SUPPORT_TICKET_SUBJECTS)[number]['key'];
export type SupportTicketEventType = (typeof SUPPORT_TICKET_EVENT_TYPES)[number];

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  email?: string;
  /** Present when an admin is viewing the app as another user. */
  impersonatorId?: string;
}

export interface TimeOfDay {
  hour: number;
  minute: number;
}

export interface AvailabilitySlot {
  time: string; // ISO datetime
  available: boolean;
  remainingTables: number;
}
