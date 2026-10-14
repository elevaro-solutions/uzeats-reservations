import mongoose from 'mongoose';
import { Invoice, Subscription } from '../models/index.js';
import { ValidationError } from '../lib/errors.js';
import { getOpenSubscriptionPayment } from './stripe.js';
import { countOpenInvoices } from './invoices.js';

export type RestaurantPlatformDebt = {
  outstandingCents: number;
  openInvoiceCount: number;
  pastDue: boolean;
  amountDueCents: number;
};

/**
 * Platform debt for a venue: unpaid period invoices plus subscription past_due /
 * amountDue (including live Stripe open invoice amount when present).
 */
export async function getRestaurantPlatformDebt(
  restaurantId: string,
): Promise<RestaurantPlatformDebt> {
  const rid = restaurantId.trim();
  const oid = new mongoose.Types.ObjectId(rid);

  const [openInvoiceCount, invoiceAgg, sub] = await Promise.all([
    countOpenInvoices(rid),
    Invoice.aggregate<{ total: number }>([
      {
        $match: {
          restaurantId: oid,
          status: { $in: ['pending', 'overdue', 'upcoming'] },
          totalCents: { $gt: 0 },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalCents' } } },
    ]),
    Subscription.findOne({ restaurantId: oid }),
  ]);

  let amountDueCents = sub?.amountDueCents ?? 0;
  if (sub?.stripeSubscriptionId) {
    try {
      const open = await getOpenSubscriptionPayment(sub.stripeSubscriptionId);
      if (open.amountDueCents > amountDueCents) amountDueCents = open.amountDueCents;
    } catch {
      // Stripe lookup failures should not hide DB debt; keep amountDueCents as-is.
    }
  }

  const invoiceOutstanding = invoiceAgg[0]?.total ?? 0;
  const pastDue = sub?.status === 'past_due';
  const outstandingCents = Math.max(invoiceOutstanding, amountDueCents);

  return {
    outstandingCents,
    openInvoiceCount,
    pastDue,
    amountDueCents,
  };
}

export async function assertRestaurantClearOfPlatformDebt(restaurantId: string) {
  const debt = await getRestaurantPlatformDebt(restaurantId);
  if (debt.openInvoiceCount > 0 || debt.pastDue || debt.amountDueCents > 0) {
    const cents = debt.outstandingCents;
    const detail =
      cents > 0
        ? ` Outstanding balance: $${(cents / 100).toFixed(2)}.`
        : '';
    throw new ValidationError(
      `Settle outstanding platform balance before deleting this restaurant.${detail}`,
    );
  }
  return debt;
}
