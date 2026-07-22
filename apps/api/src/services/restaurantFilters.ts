import type { Types } from 'mongoose';

type RestaurantSearchArgs = {
  search?: string;
  status?: string;
  city?: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildRestaurantSearchClauses(
  args: RestaurantSearchArgs,
): Record<string, unknown>[] {
  const clauses: Record<string, unknown>[] = [];
  if (args.status) clauses.push({ status: args.status });
  if (args.city) clauses.push({ 'address.city': args.city });
  if (args.search?.trim()) {
    const regex = new RegExp(escapeRegex(args.search.trim()), 'i');
    clauses.push({
      $or: [
        { name: regex },
        { cuisine: regex },
        { 'address.city': regex },
        { 'address.state': regex },
      ],
    });
  }
  return clauses;
}

export function buildOwnerRestaurantFilter(
  user: { _id: Types.ObjectId; restaurantIds: Types.ObjectId[] },
  args?: RestaurantSearchArgs,
): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [
    { $or: [{ ownerId: user._id }, { _id: { $in: user.restaurantIds } }] },
    ...buildRestaurantSearchClauses(args ?? {}),
  ];
  if (clauses.length === 1) return clauses[0]!;
  return { $and: clauses };
}

export function buildAdminRestaurantFilter(args: RestaurantSearchArgs): Record<string, unknown> {
  const clauses = buildRestaurantSearchClauses(args);
  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0]!;
  return { $and: clauses };
}
