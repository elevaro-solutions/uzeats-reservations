import { createHash, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { MessengerLink, MessengerLinkToken, Restaurant } from '../../models/index.js';
import { botMemberForUser, type BotMember } from './members.js';
import {
  normalizeAllowedActions,
  type BotActionCode,
  type BotProfile,
  type BotViewer,
} from './profiles.js';
import { telegramCall } from './telegramApi.js';

export const MAX_LINKS_PER_USER = 3;
const SELF_INVITE_TTL_MS = 24 * 3600 * 1000;
const TEAM_INVITE_TTL_MS = 7 * 24 * 3600 * 1000;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export async function createTelegramLinkInvite(params: {
  botUsername: string;
  restaurantId: string;
  userId: string;
  createdByUserId: string;
}): Promise<{ url: string; token: string; expiresAt: Date }> {
  const raw = randomBytes(24).toString('base64url');
  const self = params.userId === params.createdByUserId;
  const expiresAt = new Date(Date.now() + (self ? SELF_INVITE_TTL_MS : TEAM_INVITE_TTL_MS));
  await MessengerLinkToken.create({
    tokenHash: hashToken(raw),
    userId: new mongoose.Types.ObjectId(params.userId),
    restaurantId: new mongoose.Types.ObjectId(params.restaurantId),
    createdByUserId: new mongoose.Types.ObjectId(params.createdByUserId),
    expiresAt,
  });
  return {
    url: `https://t.me/${params.botUsername}?start=${raw}`,
    token: raw,
    expiresAt,
  };
}

function displayNameFromChat(chat: {
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}): string | null {
  if (chat.username) return `@${chat.username}`;
  if (chat.title) return chat.title;
  const name = [chat.first_name, chat.last_name].filter(Boolean).join(' ').trim();
  return name || null;
}

export function normalizeTelegramChatId(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, '');
  if (!/^-?\d{5,20}$/.test(s)) return null;
  return s;
}

async function enforceLinkLimit(
  userId: mongoose.Types.ObjectId,
  restaurantId: mongoose.Types.ObjectId,
): Promise<void> {
  const active = await MessengerLink.find({ userId, restaurantId, isActive: true })
    .sort({ linkedAt: -1 })
    .select('_id')
    .lean();
  const overflow = active.slice(MAX_LINKS_PER_USER).map((l) => l._id);
  if (overflow.length) {
    await MessengerLink.updateMany({ _id: { $in: overflow } }, { $set: { isActive: false } });
  }
}

export type ManualLinkInput = {
  botToken: string;
  restaurantId: string;
  userId: string;
  chatId: string;
  label?: string | null;
  profileOverride?: BotProfile | null;
  allowedActions?: readonly string[] | null;
  token?: string | null;
};

export async function addTelegramLinkManual(params: ManualLinkInput): Promise<{
  member: BotMember;
  linkId: string;
  displayName: string | null;
}> {
  const chatId = normalizeTelegramChatId(params.chatId);
  if (!chatId) throw new Error('Enter a valid Telegram chat id (numeric, e.g. 123456789).');

  const member = await botMemberForUser(params.restaurantId, params.userId);
  if (!member) {
    throw new Error(
      "This team member can't use the bot. Allow Messenger for them and ensure they have a venue role.",
    );
  }

  if (params.token?.trim()) {
    const raw = params.token.trim();
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(raw)) throw new Error('Invalid link token.');
    const now = new Date();
    const token = await MessengerLinkToken.findOneAndUpdate(
      { tokenHash: hashToken(raw), usedAt: null },
      { $set: { usedAt: now } },
      { new: true },
    ).lean();
    if (!token) throw new Error('Link token is invalid or already used.');
    if (token.expiresAt < now) throw new Error('Link token has expired.');
    if (
      String(token.userId) !== params.userId ||
      String(token.restaurantId) !== params.restaurantId
    ) {
      throw new Error('Link token does not match this team member.');
    }
  }

  let chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  try {
    chat = await telegramCall(params.botToken, 'getChat', { chat_id: chatId });
  } catch {
    throw new Error(
      'Could not reach that Telegram chat. The person must open the bot and tap Start once first, then try again.',
    );
  }

  const profile = params.profileOverride ?? member.profile;
  const allowedActions = normalizeAllowedActions(profile, params.allowedActions);
  const now = new Date();
  const displayName = displayNameFromChat(chat);
  const label = params.label?.trim().slice(0, 64) || null;

  const restaurantOid = new mongoose.Types.ObjectId(params.restaurantId);
  const userOid = new mongoose.Types.ObjectId(params.userId);
  await MessengerLink.updateOne(
    { channel: 'TELEGRAM', chatId, restaurantId: restaurantOid },
    {
      $set: {
        userId: userOid,
        restaurantId: restaurantOid,
        displayName,
        label,
        profileOverride: params.profileOverride ?? null,
        allowedActions,
        isActive: true,
        paused: false,
        linkedAt: now,
        lastSeenAt: now,
      },
    },
    { upsert: true },
  );

  await enforceLinkLimit(userOid, restaurantOid);
  const link = await MessengerLink.findOne({
    channel: 'TELEGRAM',
    chatId,
    restaurantId: restaurantOid,
  })
    .select('_id')
    .lean();
  return { member, linkId: String(link?._id), displayName };
}

export function viewerForLink(
  member: BotMember,
  link: {
    profileOverride?: BotProfile | null;
    allowedActions?: BotActionCode[] | null;
  },
): BotViewer {
  const profile = link.profileOverride ?? member.profile;
  return {
    profile,
    allowedActions: normalizeAllowedActions(profile, link.allowedActions),
  };
}

export type ConsumeLinkResult =
  | { ok: true; member: BotMember; restaurantName: string; replacedUser: boolean }
  | { ok: false; reason: 'invalid' | 'expired' | 'no_access' };

export async function consumeTelegramLinkToken(
  raw: string,
  chat: { chatId: string; displayName: string | null },
): Promise<ConsumeLinkResult> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(raw)) return { ok: false, reason: 'invalid' };
  const now = new Date();
  const token = await MessengerLinkToken.findOneAndUpdate(
    { tokenHash: hashToken(raw), usedAt: null },
    { $set: { usedAt: now } },
    { new: true },
  ).lean();
  if (!token) return { ok: false, reason: 'invalid' };
  if (token.expiresAt < now) return { ok: false, reason: 'expired' };

  const userId = String(token.userId);
  const restaurantId = String(token.restaurantId);
  const member = await botMemberForUser(restaurantId, userId);
  if (!member) return { ok: false, reason: 'no_access' };

  const restaurantOid = token.restaurantId;
  const previous = await MessengerLink.findOne({
    channel: 'TELEGRAM',
    chatId: chat.chatId,
    restaurantId: restaurantOid,
  }).lean();
  await MessengerLink.updateOne(
    { channel: 'TELEGRAM', chatId: chat.chatId, restaurantId: restaurantOid },
    {
      $set: {
        userId: token.userId,
        restaurantId: restaurantOid,
        displayName: chat.displayName,
        isActive: true,
        paused: false,
        linkedAt: now,
        lastSeenAt: now,
      },
    },
    { upsert: true },
  );

  await enforceLinkLimit(token.userId, restaurantOid);

  const restaurant = await Restaurant.findById(restaurantId).select('name').lean();
  return {
    ok: true,
    member,
    restaurantName: restaurant?.name ?? 'your restaurant',
    replacedUser: Boolean(previous?.isActive && String(previous.userId) !== userId),
  };
}

export async function findActiveTelegramLink(chatId: string) {
  return MessengerLink.findOne({ channel: 'TELEGRAM', chatId, isActive: true }).lean();
}

export async function findActiveTelegramLinks(chatId: string) {
  return MessengerLink.find({ channel: 'TELEGRAM', chatId, isActive: true }).lean();
}
