import mongoose from 'mongoose';
import {
  REVIEW_REACTIONS,
  type ReviewReactionType,
} from '@reservations/shared';
import { ReviewReaction } from '../models/ReviewReaction.js';

export type ReviewReactionCounts = Record<ReviewReactionType, number> & {
  total: number;
};

/** Browser-issued guest id (UUID) sent as X-Visitor-Key. */
export const VISITOR_KEY_HEADER = 'x-visitor-key';
const VISITOR_KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeVisitorKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!VISITOR_KEY_RE.test(value)) return null;
  return value.toLowerCase();
}

export function emptyReactionCounts(): ReviewReactionCounts {
  return {
    love: 0,
    helpful: 0,
    amazing: 0,
    yum: 0,
    omg: 0,
    total: 0,
  };
}

export async function getReactionCountsForReviews(
  reviewIds: Array<mongoose.Types.ObjectId | string>,
): Promise<Map<string, ReviewReactionCounts>> {
  const ids = reviewIds
    .map((id) =>
      id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id),
    )
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  const result = new Map<string, ReviewReactionCounts>();
  for (const id of ids) result.set(id.toString(), emptyReactionCounts());
  if (ids.length === 0) return result;

  const rows = await ReviewReaction.aggregate<{
    _id: { reviewId: mongoose.Types.ObjectId; type: ReviewReactionType };
    count: number;
  }>([
    { $match: { reviewId: { $in: ids } } },
    {
      $group: {
        _id: { reviewId: '$reviewId', type: '$type' },
        count: { $sum: 1 },
      },
    },
  ]);

  for (const row of rows) {
    const reviewId = row._id.reviewId.toString();
    const counts = result.get(reviewId) ?? emptyReactionCounts();
    if ((REVIEW_REACTIONS as readonly string[]).includes(row._id.type)) {
      counts[row._id.type] = row.count;
      counts.total += row.count;
    }
    result.set(reviewId, counts);
  }
  return result;
}

export async function getMyReactionsForReviews(
  reviewIds: Array<mongoose.Types.ObjectId | string>,
  identity: { userId?: string | null; visitorKey?: string | null },
): Promise<Map<string, ReviewReactionType | null>> {
  const result = new Map<string, ReviewReactionType | null>();
  for (const id of reviewIds) result.set(String(id), null);
  if (reviewIds.length === 0) return result;

  const objectIds = reviewIds
    .map((id) =>
      id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id),
    )
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  const filter: Record<string, unknown> = { reviewId: { $in: objectIds } };
  if (identity.userId) {
    filter.userId = identity.userId;
  } else if (identity.visitorKey) {
    filter.visitorKey = identity.visitorKey;
  } else {
    return result;
  }

  const docs = await ReviewReaction.find(filter).select('reviewId type');

  for (const doc of docs) {
    result.set(doc.reviewId.toString(), doc.type as ReviewReactionType);
  }
  return result;
}
