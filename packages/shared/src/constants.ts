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

export const SUPPORT_TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
] as const;

export const SUPPORT_TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export const SUPPORT_TICKET_CATEGORIES = [
  'billing',
  'account',
  'booking',
  'restaurant',
  'technical',
  'other',
] as const;

/** Predefined support subjects; `category` maps to SUPPORT_TICKET_CATEGORIES. */
export const SUPPORT_TICKET_SUBJECTS = [
  { key: 'billing_inquiry', label: 'Billing inquiry', category: 'billing' },
  { key: 'payment_failed', label: 'Payment failed', category: 'billing' },
  { key: 'refund_request', label: 'Refund request', category: 'billing' },
  { key: 'subscription_change', label: 'Subscription change', category: 'billing' },
  { key: 'invoice_question', label: 'Invoice question', category: 'billing' },
  { key: 'account_access', label: 'Account access issue', category: 'account' },
  { key: 'password_reset', label: 'Password reset help', category: 'account' },
  { key: 'profile_update', label: 'Profile / contact update', category: 'account' },
  { key: 'booking_issue', label: 'Booking issue', category: 'booking' },
  { key: 'cancellation_help', label: 'Cancellation help', category: 'booking' },
  { key: 'reservation_modification', label: 'Reservation modification', category: 'booking' },
  { key: 'no_show_dispute', label: 'No-show dispute', category: 'booking' },
  { key: 'restaurant_onboarding', label: 'Restaurant onboarding', category: 'restaurant' },
  { key: 'menu_floor_plan', label: 'Menu / floor plan help', category: 'restaurant' },
  { key: 'restaurant_settings', label: 'Restaurant settings', category: 'restaurant' },
  { key: 'staff_access', label: 'Staff access / invites', category: 'restaurant' },
  { key: 'bug_report', label: 'Bug report', category: 'technical' },
  { key: 'integration_issue', label: 'Integration issue', category: 'technical' },
  { key: 'performance_issue', label: 'Performance / outage', category: 'technical' },
  { key: 'feature_request', label: 'Feature request', category: 'other' },
  { key: 'general_inquiry', label: 'General inquiry', category: 'other' },
  { key: 'other', label: 'Other', category: 'other' },
] as const;

export const SUPPORT_TICKET_EVENT_TYPES = [
  'created',
  'status_changed',
  'priority_changed',
  'category_changed',
  'subject_changed',
  'assignee_changed',
  'restaurant_changed',
  'requester_changed',
  'note_added',
  'note_updated',
  'note_deleted',
  'attachment_added',
  'attachment_updated',
  'attachment_removed',
] as const;

export const LOYALTY = {
  POINTS_PER_COMPLETED_VISIT: 100,
  POINTS_PER_DOLLAR_DEPOSIT: 1,
  REDEEM_POINTS_PER_DOLLAR: 100,
  MIN_REDEEM_POINTS: 500,
  FIRST_BOOKING_BONUS_POINTS: 50,
  POINTS_PER_REVIEW: 25,
  REFERRAL_BONUS_POINTS: 100,
  POINTS_EXPIRY_MONTHS: 12,
} as const;

export const LOYALTY_TIERS = [
  { id: 'bronze', name: 'Bronze', minVisits: 0, earnMultiplier: 1 },
  { id: 'silver', name: 'Silver', minVisits: 5, earnMultiplier: 1.25 },
  { id: 'gold', name: 'Gold', minVisits: 15, earnMultiplier: 1.5 },
] as const;

export type LoyaltyTierId = (typeof LOYALTY_TIERS)[number]['id'];

/** Stable earn descriptions used for idempotent awards and reversals. */
export const LOYALTY_EARN_REASONS = {
  COMPLETED_VISIT: 'Completed reservation',
  DEPOSIT_PAYMENT: 'Deposit payment points',
  FIRST_BOOKING: 'First booking bonus',
  REVIEW: 'Review submitted',
  REFERRAL_BONUS: 'Referral bonus',
  POINTS_EXPIRED: 'Points expired due to inactivity',
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
  'loyaltyUpdates',
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
  points_earned: 'loyaltyUpdates',
  points_redeemed: 'loyaltyUpdates',
  points_refunded: 'loyaltyUpdates',
};

export const DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES: Record<NotificationChannel, boolean> = {
  sms: false,
  email: true,
  webPush: true,
  platform: true,
};
