export const USER_ROLES = ['diner', 'restaurant_owner', 'staff', 'admin'] as const;

export const RESTAURANT_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;

export const RESERVATION_STATUSES = [
  'pending',
  'confirmed',
  'seated',
  'completed',
  'cancelled',
  'no_show',
] as const;

export const OCCASIONS = [
  'none',
  'birthday',
  'anniversary',
  'business',
  'date',
  'celebration',
  'other',
] as const;

export const PRICE_RANGES = [1, 2, 3, 4] as const;

export const CUISINES = [
  'American',
  'Italian',
  'Mexican',
  'Japanese',
  'Chinese',
  'Indian',
  'French',
  'Mediterranean',
  'Thai',
  'Steakhouse',
  'Seafood',
  'Vegetarian',
  'Uzbek',
  'Other',
] as const;

export const WAITLIST_STATUSES = ['waiting', 'notified', 'booked', 'expired', 'cancelled'] as const;

export const LOYALTY = {
  POINTS_PER_COMPLETED_VISIT: 100,
  POINTS_PER_DOLLAR_DEPOSIT: 1,
  REDEEM_POINTS_PER_DOLLAR: 100,
  MIN_REDEEM_POINTS: 500,
} as const;

export const DEFAULT_SLOT_INTERVAL_MINUTES = 15;
export const DEFAULT_TURN_TIME_MINUTES = 90;
export const REMINDER_HOURS = [24, 2] as const;
export const CANCELLATION_REFUND_HOURS = 24;

/** Delivery channels shown as preference matrix columns. */
export const NOTIFICATION_CHANNELS = ['sms', 'email', 'webPush', 'platform'] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** Toggleable notification features (password_reset is always sent). */
export const NOTIFICATION_EVENTS = [
  'newMessage',
  'newReservation',
  'waitlistAvailable',
  'guestSpendAlert',
  'reservationUpdates',
  'reviewReply',
  'surveyInvitation',
] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

/** Maps delivery `type` strings to preference event keys. */
export const NOTIFICATION_TYPE_TO_EVENT: Record<string, NotificationEvent> = {
  new_message: 'newMessage',
  new_reservation: 'newReservation',
  waitlist_available: 'waitlistAvailable',
  waitlist_ready: 'waitlistAvailable',
  waitlist_notified: 'waitlistAvailable',
  guest_spend_alert: 'guestSpendAlert',
  reservation_confirmed: 'reservationUpdates',
  reservation_reminder: 'reservationUpdates',
  review_reply: 'reviewReply',
  survey_invitation: 'surveyInvitation',
};

export const DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES: Record<NotificationChannel, boolean> = {
  sms: false,
  email: true,
  webPush: true,
  platform: true,
};
