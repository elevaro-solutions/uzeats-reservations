import { CoverFee } from '../models/CoverFee.js';
import { Invoice } from '../models/Invoice.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { getPlatformConfig } from './platformConfig.js';

function periodBounds(period: string) {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) throw new Error('billingPeriod must be YYYY-MM');
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const dueDate = new Date(Date.UTC(year, month - 1, 1));
  return { start, end, dueDate };
}

function invoiceStatusForDueDate(
  dueDate: Date,
  now = new Date(),
): 'upcoming' | 'pending' | 'overdue' {
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (dueDate > startOfToday) return 'upcoming';
  const graceMs = 7 * 24 * 60 * 60 * 1000;
  if (now.getTime() - dueDate.getTime() > graceMs) return 'overdue';
  return 'pending';
}

export function mapInvoice(doc: any, restaurantName?: string) {
  return {
    id: doc._id.toString(),
    number: doc.number,
    restaurantId: doc.restaurantId.toString(),
    restaurantName: restaurantName ?? null,
    subscriptionId: doc.subscriptionId?.toString() ?? null,
    status: doc.status,
    billingPeriod: doc.billingPeriod,
    currency: doc.currency,
    subtotalCents: doc.subtotalCents,
    totalCents: doc.totalCents,
    lines: (doc.lines ?? []).map((l: any) => ({
      description: l.description,
      quantity: l.quantity ?? 1,
      unitAmountCents: l.unitAmountCents,
      amountCents: l.amountCents,
    })),
    dueDate: doc.dueDate,
    paidAt: doc.paidAt ?? null,
    canceledAt: doc.canceledAt ?? null,
    notes: doc.notes ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function generateInvoicesForPeriod(period: string) {
  const { dueDate } = periodBounds(period);
  const config = await getPlatformConfig();
  const prefix = config.invoicePrefix || 'INV';
  const currency = config.currency || 'usd';
  const status = invoiceStatusForDueDate(dueDate);

  const subs = await Subscription.find({
    status: { $in: ['trialing', 'active', 'past_due'] },
  });

  let created = 0;
  let skipped = 0;

  for (const sub of subs) {
    const existing = await Invoice.findOne({
      restaurantId: sub.restaurantId,
      billingPeriod: period,
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const lines: Array<{
      description: string;
      quantity: number;
      unitAmountCents: number;
      amountCents: number;
    }> = [];

    if (sub.status !== 'trialing' || !sub.trialEndsAt || sub.trialEndsAt <= dueDate) {
      lines.push({
        description: `${String(sub.plan).toUpperCase()} plan — ${period}`,
        quantity: 1,
        unitAmountCents: sub.monthlyPriceCents,
        amountCents: sub.monthlyPriceCents,
      });
    } else {
      lines.push({
        description: `${String(sub.plan).toUpperCase()} plan trial — ${period}`,
        quantity: 1,
        unitAmountCents: 0,
        amountCents: 0,
      });
    }

    const coverFees = await CoverFee.find({
      restaurantId: sub.restaurantId,
      billingPeriod: period,
      status: { $in: ['pending', 'charged'] },
    });
    const coverTotal = coverFees.reduce((sum, f) => sum + f.feeCents, 0);
    if (coverTotal > 0) {
      lines.push({
        description: `Cover fees (${coverFees.length} reservations)`,
        quantity: coverFees.length || 1,
        unitAmountCents: coverFees.length ? Math.round(coverTotal / coverFees.length) : coverTotal,
        amountCents: coverTotal,
      });
    }

    const subtotalCents = lines.reduce((sum, l) => sum + l.amountCents, 0);
    const seq = String(created + skipped + 1).padStart(4, '0');
    const number = `${prefix}-${period.replace('-', '')}-${seq}`;

    await Invoice.create({
      number,
      restaurantId: sub.restaurantId,
      subscriptionId: sub._id,
      status: subtotalCents === 0 && sub.status === 'trialing' ? 'paid' : status,
      billingPeriod: period,
      currency,
      subtotalCents,
      totalCents: subtotalCents,
      lines,
      dueDate,
      paidAt: subtotalCents === 0 ? new Date() : undefined,
    });
    created += 1;
  }

  return { created, skipped, period };
}

export async function listInvoices(input: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(input.limit ?? 50, 200);
  const offset = input.offset ?? 0;
  const filter: Record<string, unknown> = {};
  if (input.status) filter.status = input.status;

  if (input.search?.trim()) {
    const q = input.search.trim();
    const restaurants = await Restaurant.find({
      name: { $regex: q, $options: 'i' },
    }).select('_id');
    filter.$or = [
      { number: { $regex: q, $options: 'i' } },
      { restaurantId: { $in: restaurants.map((r) => r._id) } },
    ];
  }

  const [items, total] = await Promise.all([
    Invoice.find(filter).sort({ dueDate: -1, createdAt: -1 }).skip(offset).limit(limit),
    Invoice.countDocuments(filter),
  ]);

  const restaurantIds = [...new Set(items.map((i) => i.restaurantId.toString()))];
  const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } }).select('name');
  const nameById = new Map(restaurants.map((r) => [r._id.toString(), r.name]));

  return {
    total,
    items: items.map((doc) => mapInvoice(doc, nameById.get(doc.restaurantId.toString()))),
  };
}

export type InvoiceStatusValue = 'upcoming' | 'pending' | 'paid' | 'canceled' | 'overdue';

export async function setInvoiceStatus(id: string, status: InvoiceStatusValue) {
  const doc = await Invoice.findById(id);
  if (!doc) throw new Error('Invoice not found');
  doc.status = status;
  if (status === 'paid') {
    doc.paidAt = new Date();
    doc.canceledAt = undefined;
  } else if (status === 'canceled') {
    doc.canceledAt = new Date();
  } else {
    doc.paidAt = undefined;
    doc.canceledAt = undefined;
  }
  await doc.save();
  const restaurant = await Restaurant.findById(doc.restaurantId).select('name');
  return mapInvoice(doc, restaurant?.name);
}

export async function setInvoiceStatuses(ids: string[], status: InvoiceStatusValue) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) throw new Error('No invoices selected');

  const items = [];
  for (const id of uniqueIds) {
    items.push(await setInvoiceStatus(id, status));
  }
  return { updated: items.length, items };
}

export async function getPlatformRevenueReport(period?: string) {
  const now = new Date();
  const currentPeriod = period ?? now.toISOString().slice(0, 7);

  const [
    activeSubs,
    trialingSubs,
    pastDueSubs,
    cancelledSubs,
    invoiceAgg,
    coverAgg,
    invoicesByStatus,
  ] = await Promise.all([
    Subscription.countDocuments({ status: 'active' }),
    Subscription.countDocuments({ status: 'trialing' }),
    Subscription.countDocuments({ status: 'past_due' }),
    Subscription.countDocuments({ status: 'cancelled' }),
    Invoice.aggregate([
      { $match: { billingPeriod: currentPeriod, status: { $ne: 'canceled' } } },
      {
        $group: {
          _id: null,
          billedCents: { $sum: '$totalCents' },
          paidCents: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalCents', 0] },
          },
          outstandingCents: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'upcoming', 'overdue']] },
                '$totalCents',
                0,
              ],
            },
          },
          invoiceCount: { $sum: 1 },
        },
      },
    ]),
    CoverFee.aggregate([
      { $match: { billingPeriod: currentPeriod } },
      {
        $group: {
          _id: null,
          coverFeeCents: { $sum: '$feeCents' },
          covers: { $sum: '$partySize' },
        },
      },
    ]),
    Invoice.aggregate([
      { $match: { billingPeriod: currentPeriod } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalCents: { $sum: '$totalCents' } } },
    ]),
  ]);

  const mrrAgg = await Subscription.aggregate([
    { $match: { status: { $in: ['active', 'past_due'] } } },
    { $group: { _id: null, mrrCents: { $sum: '$monthlyPriceCents' } } },
  ]);

  const byPlan = await Subscription.aggregate([
    { $match: { status: { $in: ['active', 'trialing', 'past_due'] } } },
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
        mrrCents: {
          $sum: {
            $cond: [{ $eq: ['$status', 'trialing'] }, 0, '$monthlyPriceCents'],
          },
        },
      },
    },
  ]);

  const inv = invoiceAgg[0] ?? {
    billedCents: 0,
    paidCents: 0,
    outstandingCents: 0,
    invoiceCount: 0,
  };
  const cover = coverAgg[0] ?? { coverFeeCents: 0, covers: 0 };

  return {
    period: currentPeriod,
    mrrCents: mrrAgg[0]?.mrrCents ?? 0,
    arrCents: (mrrAgg[0]?.mrrCents ?? 0) * 12,
    activeSubscriptions: activeSubs,
    trialingSubscriptions: trialingSubs,
    pastDueSubscriptions: pastDueSubs,
    cancelledSubscriptions: cancelledSubs,
    billedCents: inv.billedCents,
    paidCents: inv.paidCents,
    outstandingCents: inv.outstandingCents,
    invoiceCount: inv.invoiceCount,
    coverFeeCents: cover.coverFeeCents,
    covers: cover.covers,
    byPlan: byPlan.map((p) => ({
      plan: p._id,
      count: p.count,
      mrrCents: p.mrrCents,
    })),
    byInvoiceStatus: invoicesByStatus.map((s) => ({
      status: s._id,
      count: s.count,
      totalCents: s.totalCents,
    })),
  };
}
