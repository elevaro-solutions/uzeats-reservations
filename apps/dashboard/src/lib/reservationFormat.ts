import { DISPLAY_LOCALE, OCCASION_LABELS } from '@reservations/shared';

export function guestName(diner?: {
  firstName?: string | null;
  lastName?: string | null;
} | null) {
  return `${diner?.firstName ?? ''} ${diner?.lastName ?? ''}`.trim() || 'Walk-in / phone';
}

export function guestInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  return letters || 'G';
}

export function formatOccasion(occasion?: string | null) {
  if (!occasion || occasion === 'none') return null;
  return OCCASION_LABELS[occasion as keyof typeof OCCASION_LABELS]
    ?? occasion.charAt(0).toUpperCase() + occasion.slice(1);
}

export function formatSource(source?: string | null) {
  if (!source) return null;
  if (source === 'walkin') return 'Walk-in';
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export function formatUsd(cents?: number | null) {
  if (!cents) return null;
  return new Intl.NumberFormat(DISPLAY_LOCALE, { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  );
}

export function formatDepositStatus(status?: string | null) {
  if (!status) return null;
  return status.replace(/_/g, ' ');
}
