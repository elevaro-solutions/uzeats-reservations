import mongoose from 'mongoose';
import { MessengerLink, MessengerReservationMessage } from '../../models/index.js';
import { logger } from '../../lib/logger.js';
import { viewerForLink } from './linking.js';
import { botMemberForUser, type BotMember } from './members.js';
import {
  renderReservationCardKeyboard,
  renderReservationCardMessage,
  type ReservationCardData,
} from './reservationCard.js';
import type { BotActionCode, BotProfile, BotViewer } from './profiles.js';
import {
  editTelegramText,
  isTelegramChatGone,
  sendTelegramText,
  telegramCall,
  type TelegramInlineKeyboard,
} from './telegramApi.js';

type LinkActionPrefs = {
  profileOverride?: BotProfile | null;
  allowedActions?: BotActionCode[] | null;
};

async function retireChat(chatId: string): Promise<void> {
  await MessengerLink.updateMany(
    { channel: 'TELEGRAM', chatId },
    { $set: { isActive: false } },
  ).catch(() => undefined);
}

function cardMarkup(card: ReservationCardData, viewer: BotViewer) {
  const message = renderReservationCardMessage(card, viewer);
  return { ...message, keyboard: renderReservationCardKeyboard(card, viewer) };
}

export async function sendReservationCard(
  token: string,
  card: ReservationCardData & { restaurantId: string },
  member: BotMember,
  chatId: string,
  linkPrefs?: LinkActionPrefs | null,
): Promise<boolean> {
  const existing = await MessengerReservationMessage.findOne({
    reservationId: card.reservationId,
    channel: 'TELEGRAM',
    chatId,
  }).lean();
  if (existing) return false;

  const viewer: BotViewer = linkPrefs
    ? viewerForLink(member, linkPrefs)
    : { profile: member.profile };
  const { text, entities, keyboard } = cardMarkup(card, viewer);
  try {
    const msg = await sendTelegramText(token, chatId, text, keyboard, entities);
    await MessengerReservationMessage.create({
      channel: 'TELEGRAM',
      chatId,
      messageId: String(msg.message_id),
      reservationId: new mongoose.Types.ObjectId(card.reservationId),
      restaurantId: new mongoose.Types.ObjectId(card.restaurantId),
      userId: new mongoose.Types.ObjectId(member.userId),
      profile: viewer.profile,
    }).catch((err: { code?: number }) => {
      if (err?.code !== 11000) throw err;
    });
    return true;
  } catch (err) {
    if (isTelegramChatGone(err)) {
      await retireChat(chatId);
      return false;
    }
    logger.warn(
      { err, chatId, reservationId: card.reservationId },
      '[messenger-bot] send card failed',
    );
    return false;
  }
}

export async function editReservationCardMessage(
  token: string,
  card: ReservationCardData,
  viewer: BotViewer,
  chatId: string,
  messageId: string,
  keyboardOverride?: TelegramInlineKeyboard,
): Promise<void> {
  const { text, entities, keyboard } = cardMarkup(card, viewer);
  try {
    await editTelegramText(
      token,
      chatId,
      messageId,
      text,
      keyboardOverride ?? keyboard,
      entities,
    );
  } catch (err) {
    if (isTelegramChatGone(err)) {
      await retireChat(chatId);
      return;
    }
    logger.warn({ err, chatId, messageId }, '[messenger-bot] edit card failed');
  }
}

export async function refreshReservationCards(
  token: string,
  card: ReservationCardData & { restaurantId: string },
): Promise<Array<{ chatId: string; messageId: string; userId: string; profile: BotProfile }>> {
  const rows = await MessengerReservationMessage.find({
    reservationId: card.reservationId,
    channel: 'TELEGRAM',
  }).lean();
  const chatIds = rows.map((r) => r.chatId);
  const links = await MessengerLink.find({
    channel: 'TELEGRAM',
    restaurantId: new mongoose.Types.ObjectId(card.restaurantId),
    chatId: { $in: chatIds },
    isActive: true,
  })
    .select('chatId profileOverride allowedActions')
    .lean();
  const linkByChat = new Map(links.map((l) => [l.chatId, l]));
  const memberCache = new Map<string, BotMember | null>();
  for (const row of rows) {
    const uid = String(row.userId);
    if (!memberCache.has(uid)) {
      memberCache.set(uid, await botMemberForUser(card.restaurantId, uid).catch(() => null));
    }
    const member = memberCache.get(uid);
    const link = linkByChat.get(row.chatId);
    const viewer: BotViewer = member
      ? viewerForLink(member, {
          profileOverride: (link?.profileOverride as BotProfile | null | undefined) ?? null,
          allowedActions: (link?.allowedActions as BotActionCode[] | null | undefined) ?? null,
        })
      : { profile: row.profile as BotProfile };
    await editReservationCardMessage(
      token,
      card,
      viewer,
      row.chatId,
      row.messageId,
      member ? undefined : { inline_keyboard: [] },
    );
  }
  return rows.map((r) => ({
    chatId: r.chatId,
    messageId: r.messageId,
    userId: String(r.userId),
    profile: r.profile as BotProfile,
  }));
}

export async function replyUnderCard(
  token: string,
  chatId: string,
  messageId: string,
  text: string,
): Promise<void> {
  try {
    await telegramCall(token, 'sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_parameters: { message_id: Number(messageId), allow_sending_without_reply: true },
    });
  } catch (err) {
    if (isTelegramChatGone(err)) await retireChat(chatId);
  }
}
