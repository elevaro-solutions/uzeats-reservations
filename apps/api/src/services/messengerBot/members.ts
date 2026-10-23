import mongoose from 'mongoose';
import { Restaurant, User } from '../../models/index.js';
import { profileForRole, type BotProfile } from './profiles.js';

export type BotMember = {
  userId: string;
  restaurantId: string;
  /** OWNER or the user's role. */
  role: string;
  profile: BotProfile;
};

type UserLean = {
  _id: mongoose.Types.ObjectId;
  role: string;
  canActViaMessenger?: boolean | null;
  restaurantIds?: mongoose.Types.ObjectId[];
};

function staffToMember(
  u: UserLean,
  restaurantId: string,
  isOwner: boolean,
): BotMember | null {
  if (!isOwner && u.canActViaMessenger === false) return null;
  const role = isOwner ? 'OWNER' : u.role;
  const profile = isOwner ? ('FOH' as const) : profileForRole(u.role);
  if (!profile) return null;
  return {
    userId: String(u._id),
    restaurantId,
    role,
    profile,
  };
}

/** Owner plus staff with restaurantIds containing this venue and bot access. */
export async function restaurantBotMembers(restaurantId: string): Promise<BotMember[]> {
  const rid = new mongoose.Types.ObjectId(restaurantId);
  const restaurant = await Restaurant.findById(rid).select('ownerId').lean();
  if (!restaurant) return [];
  const ownerId = restaurant.ownerId ? String(restaurant.ownerId) : null;

  const staff = await User.find({
    $or: [{ _id: restaurant.ownerId }, { restaurantIds: rid }],
  })
    .select('_id role canActViaMessenger restaurantIds')
    .lean<UserLean[]>();

  const members: BotMember[] = [];
  const seen = new Set<string>();
  for (const u of staff) {
    const id = String(u._id);
    if (seen.has(id)) continue;
    seen.add(id);
    const isOwner = ownerId === id;
    const m = staffToMember(u, restaurantId, isOwner);
    if (m) members.push(m);
  }
  return members;
}

export async function botMemberForUser(
  restaurantId: string,
  userId: string,
): Promise<BotMember | null> {
  const rid = new mongoose.Types.ObjectId(restaurantId);
  const uid = new mongoose.Types.ObjectId(userId);
  const restaurant = await Restaurant.findById(rid).select('ownerId').lean();
  if (!restaurant) return null;
  const isOwner = restaurant.ownerId != null && String(restaurant.ownerId) === userId;
  const user = await User.findById(uid)
    .select('_id role canActViaMessenger restaurantIds')
    .lean<UserLean | null>();
  if (!user) return null;
  if (!isOwner) {
    const onTeam = user.restaurantIds?.some((id) => String(id) === restaurantId);
    if (!onTeam) return null;
  }
  return staffToMember(user, restaurantId, isOwner);
}

/** Every restaurant where this user is owner or bot-enabled staff. */
export async function botMembershipsForUser(userId: string): Promise<BotMember[]> {
  const uid = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(uid)
    .select('_id role canActViaMessenger restaurantIds')
    .lean<UserLean | null>();
  if (!user) return [];

  const owned = await Restaurant.find({ ownerId: uid }).select('_id').lean();
  const out: BotMember[] = owned.map((r) => ({
    userId,
    restaurantId: String(r._id),
    role: 'OWNER',
    profile: 'FOH' as const,
  }));
  const ownedIds = new Set(out.map((m) => m.restaurantId));

  for (const rid of user.restaurantIds ?? []) {
    const restaurantId = String(rid);
    if (ownedIds.has(restaurantId)) continue;
    const m = staffToMember(user, restaurantId, false);
    if (m) out.push(m);
  }
  return out;
}
