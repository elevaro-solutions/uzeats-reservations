import type { Types } from 'mongoose';
import { Invoice, Restaurant, Subscription } from '../models/index.js';
import { buildOwnerRestaurantFilter } from './restaurantFilters.js';
import { mapInvoice } from './invoices.js';

const OPEN_INVOICE_STATUSES = ['pending', 'overdue', 'upcoming'] as const;

export async function countOpenInvoicesForRestaurants(restaurantIds: Types.ObjectId[]) {
  if (restaurantIds.length === 0) return 0;
  return Invoice.countDocuments({
    restaurantId: { $in: restaurantIds },
    status: { $in: [...OPEN_INVOICE_STATUSES] },
    totalCents: { $gt: 0 },
  });
}

export async function buildBillingOverview(user: {
  _id: Types.ObjectId;
  restaurantIds: Types.ObjectId[];
}) {
  const restaurants = await Restaurant.find(buildOwnerRestaurantFilter(user))
    .select('_id name')
    .sort({ name: 1 })
    .lean();
  const ids = restaurants.map((r) => r._id);
  if (ids.length === 0) {
    return {
      openInvoiceCount: 0,
      outstandingCents: 0,
      locations: [],
      openInvoices: [],
    };
  }

  const [subs, invoices, totals] = await Promise.all([
    Subscription.find({ restaurantId: { $in: ids } })
      .select('restaurantId plan status')
      .lean(),
    Invoice.find({
      restaurantId: { $in: ids },
      status: { $in: [...OPEN_INVOICE_STATUSES] },
      totalCents: { $gt: 0 },
    })
      .sort({ dueDate: 1, createdAt: 1 })
      .limit(100),
    Invoice.aggregate<{ _id: Types.ObjectId; count: number; cents: number }>([
      {
        $match: {
          restaurantId: { $in: ids },
          status: { $in: [...OPEN_INVOICE_STATUSES] },
          totalCents: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: '$restaurantId',
          count: { $sum: 1 },
          cents: { $sum: '$totalCents' },
        },
      },
    ]),
  ]);

  const subByRestaurant = new Map(subs.map((sub) => [sub.restaurantId.toString(), sub]));
  const nameById = new Map(restaurants.map((r) => [r._id.toString(), r.name]));
  const outstandingById = new Map(
    totals.map((row) => [row._id.toString(), { count: row.count, cents: row.cents }]),
  );

  const locations = restaurants.map((r) => {
    const id = r._id.toString();
    const sub = subByRestaurant.get(id);
    const outstanding = outstandingById.get(id);
    return {
      restaurantId: id,
      name: r.name,
      plan: sub?.plan ?? null,
      subscriptionStatus: sub?.status ?? null,
      openInvoiceCount: outstanding?.count ?? 0,
      outstandingCents: outstanding?.cents ?? 0,
    };
  });

  const outstandingCents = locations.reduce((sum, loc) => sum + loc.outstandingCents, 0);
  const openInvoiceCount = locations.reduce((sum, loc) => sum + loc.openInvoiceCount, 0);

  return {
    openInvoiceCount,
    outstandingCents,
    locations,
    openInvoices: invoices.map((doc) =>
      mapInvoice(doc, nameById.get(doc.restaurantId.toString())),
    ),
  };
}
