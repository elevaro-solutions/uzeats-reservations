import { User } from '../models/User.js';
import { GuestProfile } from '../models/GuestProfile.js';

function searchRegex(search: string) {
  return new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export type WaitlistGuestSearchHit = {
  dinerId: string;
  guestName: string;
  guestPhone: string | null;
  email: string | null;
  totalVisits: number;
  vipStatus: string | null;
  inGuestBook: boolean;
};

/**
 * Find diners to attach to an in-house waitlist entry.
 * Matches platform diner accounts by name/email/phone (digit-tolerant),
 * and prefers those already in the restaurant guest book.
 */
export async function searchWaitlistGuests(input: {
  restaurantId: string;
  search: string;
  limit?: number;
}): Promise<WaitlistGuestSearchHit[]> {
  const q = input.search.trim();
  if (q.length < 2) return [];

  const limit = Math.min(Math.max(input.limit ?? 12, 1), 30);
  const regex = searchRegex(q);
  const digits = q.replace(/\D/g, '');

  const or: Record<string, unknown>[] = [
    { firstName: regex },
    { lastName: regex },
    { email: regex },
    { phone: regex },
    // "Jane Sm" should match firstName+lastName, not only a single field.
    {
      $expr: {
        $regexMatch: {
          input: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$firstName', ''] },
                  ' ',
                  { $ifNull: ['$lastName', ''] },
                ],
              },
            },
          },
          regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          options: 'i',
        },
      },
    },
  ];
  // "+1 (212) 555-1234" stored as +12125551234 — allow partial digit search.
  if (digits.length >= 3) {
    or.push({ phone: new RegExp(digits.split('').join('\\D*')) });
  }

  const users = await User.find({
    role: 'diner',
    $or: or,
  })
    .select('firstName lastName phone email')
    .sort({ firstName: 1, lastName: 1 })
    .limit(limit * 2)
    .lean();

  if (users.length === 0) return [];

  const dinerIds = users.map((u) => u._id);
  const profiles = await GuestProfile.find({
    restaurantId: input.restaurantId,
    dinerId: { $in: dinerIds },
  })
    .select('dinerId totalVisits vipStatus')
    .lean();

  const profileByDiner = new Map(
    profiles.map((p) => [p.dinerId.toString(), p]),
  );

  const hits: WaitlistGuestSearchHit[] = users.map((u) => {
    const id = u._id.toString();
    const profile = profileByDiner.get(id);
    const guestName =
      [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || 'Guest';
    return {
      dinerId: id,
      guestName,
      guestPhone: u.phone ?? null,
      email: u.email ?? null,
      totalVisits: profile?.totalVisits ?? 0,
      vipStatus: profile?.vipStatus ?? null,
      inGuestBook: Boolean(profile),
    };
  });

  // Guest-book matches first, then other platform diners.
  hits.sort((a, b) => {
    if (a.inGuestBook !== b.inGuestBook) return a.inGuestBook ? -1 : 1;
    return a.guestName.localeCompare(b.guestName);
  });

  return hits.slice(0, limit);
}
