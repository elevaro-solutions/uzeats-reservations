import { LOYALTY_EARN_REASONS } from '@reservations/shared';

export type LoyaltyTransactionItem = {
  id: string;
  type: string;
  points: number;
  description: string;
  createdAt: string;
};

export type LoyaltyHistoryKind =
  | 'visit'
  | 'deposit'
  | 'firstBooking'
  | 'review'
  | 'referral'
  | 'redeem'
  | 'refund'
  | 'expired'
  | 'reversal'
  | 'other';

export type LoyaltyHistoryFilter = 'all' | 'earned' | 'redeemed' | 'expired';

export type LoyaltyHistoryEntry = LoyaltyTransactionItem & {
  kind: LoyaltyHistoryKind;
  label: string;
  group: Exclude<LoyaltyHistoryFilter, 'all'> | 'adjusted';
};

function classify(item: LoyaltyTransactionItem): Pick<LoyaltyHistoryEntry, 'kind' | 'label' | 'group'> {
  const description = item.description ?? '';

  if (description.startsWith('Points expired')) {
    return { kind: 'expired', label: 'Points expired', group: 'expired' };
  }
  if (item.type === 'redeem') {
    return { kind: 'redeem', label: 'Redeemed at checkout', group: 'redeemed' };
  }
  if (description.startsWith(LOYALTY_EARN_REASONS.REFERRAL_BONUS)) {
    return { kind: 'referral', label: 'Referral bonus — a friend completed their first visit', group: 'earned' };
  }
  if (description === LOYALTY_EARN_REASONS.COMPLETED_VISIT) {
    return { kind: 'visit', label: 'Completed visit', group: 'earned' };
  }
  if (description === LOYALTY_EARN_REASONS.DEPOSIT_PAYMENT) {
    return { kind: 'deposit', label: 'Deposit paid', group: 'earned' };
  }
  if (description === LOYALTY_EARN_REASONS.FIRST_BOOKING) {
    return { kind: 'firstBooking', label: 'First booking bonus', group: 'earned' };
  }
  if (description === LOYALTY_EARN_REASONS.REVIEW) {
    return { kind: 'review', label: 'Review submitted', group: 'earned' };
  }
  if (description.startsWith('Points refunded')) {
    return { kind: 'refund', label: description, group: 'earned' };
  }
  if (item.points < 0) {
    return { kind: 'reversal', label: description, group: 'adjusted' };
  }
  if (/^completed (visit|reservation)/i.test(description)) {
    return { kind: 'visit', label: description, group: 'earned' };
  }
  if (/^deposit/i.test(description)) {
    return { kind: 'deposit', label: description, group: 'earned' };
  }
  if (/bonus/i.test(description)) {
    return { kind: 'firstBooking', label: description, group: 'earned' };
  }
  return { kind: 'other', label: description, group: 'earned' };
}

export function toLoyaltyHistoryEntries(items: readonly LoyaltyTransactionItem[]): LoyaltyHistoryEntry[] {
  return items.map((item) => ({ ...item, ...classify(item) }));
}

export function filterLoyaltyHistory(
  entries: readonly LoyaltyHistoryEntry[],
  filter: LoyaltyHistoryFilter,
): LoyaltyHistoryEntry[] {
  if (filter === 'all') return [...entries];
  return entries.filter((entry) => entry.group === filter);
}

/** Groups entries (already newest-first) under "Month YYYY" headings. */
export function groupLoyaltyHistoryByMonth(
  entries: readonly LoyaltyHistoryEntry[],
): { key: string; label: string; entries: LoyaltyHistoryEntry[] }[] {
  const groups = new Map<string, { key: string; label: string; entries: LoyaltyHistoryEntry[] }>();
  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        entries: [],
      };
      groups.set(key, group);
    }
    group.entries.push(entry);
  }
  return [...groups.values()];
}

export function sumEarnedPoints(items: readonly LoyaltyTransactionItem[]): number {
  return items.reduce((total, item) => (item.type === 'earn' && item.points > 0 ? total + item.points : total), 0);
}
