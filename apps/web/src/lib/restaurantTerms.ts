import {
  CANCELLATION_REFUND_HOURS,
  formatCancellationPeriodLabel,
  resolveDepositPolicy,
} from '@reservations/shared';

type CancellationParams = {
  depositRequired?: boolean;
  depositAmountCents?: number;
  depositPolicy?: string | null;
  refundHours?: number;
};

export function formatCancellationLeadTime(hours = CANCELLATION_REFUND_HOURS): string {
  return formatCancellationPeriodLabel(hours);
}

export function buildCancellationPolicy({
  depositRequired,
  depositAmountCents = 0,
  depositPolicy,
  refundHours = CANCELLATION_REFUND_HOURS,
}: CancellationParams): string {
  const leadTime = formatCancellationLeadTime(refundHours);

  if (depositRequired && depositAmountCents > 0) {
    const perGuest = `$${(depositAmountCents / 100).toFixed(2)}`;
    if (resolveDepositPolicy(depositPolicy) === 'card_guarantee') {
      return [
        `A card is required to hold your reservation but is not charged when you book.`,
        `Cancellations made at least ${leadTime} before your reservation are free.`,
        `Cancellations within ${leadTime} of your reservation and no-shows are charged ${perGuest} per guest.`,
      ].join(' ');
    }
    return [
      `Cancellations made at least ${leadTime} before your reservation time receive a full deposit refund (${perGuest} per guest).`,
      `Cancellations within ${leadTime} of your reservation, no-shows, and arrivals more than 15 minutes late may result in forfeiture of your deposit.`,
    ].join(' ');
  }

  return [
    `You may cancel or modify your reservation at any time before your booking through Tablevera.`,
    `Please cancel at least ${leadTime} in advance when possible so the table can be offered to other guests.`,
    `Repeated no-shows or late cancellations may affect future bookings at this restaurant.`,
  ].join(' ');
}

export function buildCancellationPolicySummary({
  depositRequired,
  depositAmountCents = 0,
  depositPolicy,
  refundHours = CANCELLATION_REFUND_HOURS,
}: CancellationParams): string {
  const leadTime = formatCancellationLeadTime(refundHours);

  if (depositRequired && depositAmountCents > 0) {
    if (resolveDepositPolicy(depositPolicy) === 'card_guarantee') {
      return `Free cancellation up to ${leadTime} before your reservation. Card on file is charged only for late cancellations or no-shows.`;
    }
    return `Free cancellation up to ${leadTime} before your reservation. Deposit refunded if you cancel in time.`;
  }

  return `Please cancel at least ${leadTime} before your reservation when possible.`;
}

type Params = {
  name: string;
  depositRequired?: boolean;
  depositAmountCents?: number;
  depositPolicy?: string | null;
};

export function buildDefaultRestaurantTerms({
  name,
  depositRequired,
  depositAmountCents = 0,
  depositPolicy,
}: Params): string {
  const prepaid = resolveDepositPolicy(depositPolicy) === 'prepaid';
  const lines = [
    `Reservations at ${name} are confirmed through Tablevera and subject to availability.`,
    `Please arrive on time for your reservation. The restaurant may release your table if you are more than 15 minutes late.`,
    prepaid && depositRequired && depositAmountCents > 0
      ? `A deposit of $${(depositAmountCents / 100).toFixed(2)} per guest is required when booking. Deposits are applied toward your final bill.`
      : null,
    buildCancellationPolicy({ depositRequired, depositAmountCents, depositPolicy }),
    `Special requests and dietary needs should be noted when booking. The restaurant will do its best to accommodate them but cannot guarantee every request.`,
    `For changes or cancellations, use your Tablevera reservation details or contact the restaurant directly.`,
  ].filter(Boolean);

  return lines.join('\n\n');
}

type ResolveTermsParams = Params & {
  termsAndConditions?: string | null;
};

export function resolveRestaurantTerms({
  termsAndConditions,
  ...params
}: ResolveTermsParams): string {
  return termsAndConditions?.trim() || buildDefaultRestaurantTerms(params);
}
