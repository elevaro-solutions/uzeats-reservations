export type AvailabilitySlot = {
  time: string;
  available: boolean;
  remainingTables: number;
};

export type BookableTable = {
  id: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  floorArea?: string | null;
  photoUrl?: string | null;
};

export type BookablePackage = {
  id: string;
  title: string;
  description?: string | null;
  priceCents: number;
  pricePerGuest: boolean;
  includes?: string[] | null;
  photoUrl?: string | null;
  occasions?: string[] | null;
  minPartySize?: number | null;
  maxPartySize?: number | null;
  active: boolean;
};

export type BookableExperience = {
  id: string;
  restaurantId: string;
  title: string;
  description?: string | null;
  type?: string | null;
  photoUrl?: string | null;
  date: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  ticketPriceCents: number;
  availableTickets: number;
  status: string;
  tags?: string[] | null;
};

export type PrivateDiningSpace = {
  id: string;
  name: string;
  description?: string | null;
  minGuests: number;
  maxGuests: number;
  rentalFeeCents: number;
  minimumSpendCents?: number | null;
  photoUrl?: string | null;
  amenities?: string[] | null;
  active: boolean;
};

export type PromotionValidation = {
  valid: boolean;
  message?: string | null;
  discountCents: number;
  discountedDepositCents?: number | null;
  autoApplied?: boolean | null;
  promotion?: {
    title?: string | null;
    discountPercent?: number | null;
  } | null;
};

export type RestaurantBookingInfo = {
  id: string;
  name: string;
  slug?: string | null;
  photos?: string[] | null;
  phone?: string | null;
  website?: string | null;
  cuisine?: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
  depositRequired?: boolean | null;
  depositAmountCents: number;
  loyaltyEnabled?: boolean | null;
  loyaltyPointsPerVisit?: number | null;
  loyaltyMinRedeemPoints?: number | null;
  allowGuestTableSelection: boolean;
  reservationsEnabled?: boolean | null;
  reservationsVisible?: boolean | null;
  bookingWindow?: {
    maxAdvanceDays: number;
    minAdvanceHours: number;
  } | null;
  shifts?: BookingShift[] | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    neighborhood?: string | null;
  } | null;
  tables?: { maxCapacity: number; active: boolean }[] | null;
};

export type BookingShift = {
  id: string;
  name: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  active: boolean;
};

export type BookingStep = "datetime" | "details";
