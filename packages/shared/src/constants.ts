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
