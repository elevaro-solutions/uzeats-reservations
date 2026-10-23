import mongoose from 'mongoose';
import { MessengerLink, Reservation, Restaurant, User } from '../../models/index.js';
import { logger } from '../../lib/logger.js';
import { handleReservationButton } from './actions.js';
import { getBotPlatformConfig, restaurantBotActive } from './config.js';
import { sendReservationCard } from './delivery.js';
import {
  consumeTelegramLinkToken,
  findActiveTelegramLink,
  findActiveTelegramLinks,
} from './linking.js';
import { botMembershipsForUser, type BotMember } from './members.js';
import { parseCallbackData } from './reservationCard.js';
import { loadReservationCard } from './reservationCardData.js';
import {
  BOT_PROFILE_LABELS,
  profileActiveStatuses,
  reservationStatusLabel,
} from './profiles.js';
import {
  answerTelegramCallback,
  escapeTelegramHtml as esc,
  sendTelegramText,
  type TelegramCallbackQuery,
  type TelegramMessage,
  type TelegramReplyKeyboard,
  type TelegramUpdate,
} from './telegramApi.js';

const BTN_ACTIVE = '📋 Active reservations';
const BTN_PAUSE = '⏸ Pause alerts';
const BTN_RESUME = '▶️ Resume alerts';
const BTN_HELP = '❓ Help';
const MAX_LISTED = 20;

function menuKeyboard(paused: boolean): TelegramReplyKeyboard {
  return {
    keyboard: [
      [{ text: BTN_ACTIVE }],
      [{ text: paused ? BTN_RESUME : BTN_PAUSE }, { text: BTN_HELP }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

const NOT_LINKED_TEXT = [
  '👋 <b>Hi! I deliver Tablevera reservation alerts to restaurant teams.</b>',
  '',
  'To connect this chat, open the Tablevera dashboard → <b>Notifications</b> → <b>Connect Telegram</b>,',
  'or ask your manager to send you an invite link.',
].join('\n');

async function activeMemberships(
  userId: string,
): Promise<Array<BotMember & { restaurantName: string }>> {
  const [cfg, memberships] = await Promise.all([
    getBotPlatformConfig(),
    botMembershipsForUser(userId),
  ]);
  if (!memberships.length) return [];
  const restaurants = await Restaurant.find({
    _id: { $in: memberships.map((m) => new mongoose.Types.ObjectId(m.restaurantId)) },
  })
    .select('name messengerBotAccess messengerBotEnabled')
    .lean();
  const byId = new Map(restaurants.map((r) => [String(r._id), r]));
  return memberships
    .filter((m) => restaurantBotActive(cfg, byId.get(m.restaurantId)))
    .map((m) => ({ ...m, restaurantName: byId.get(m.restaurantId)?.name ?? 'Restaurant' }));
}

function describeMemberships(list: Array<BotMember & { restaurantName: string }>): string {
  if (!list.length) {
    return "⚠️ The bot isn't active for any of your restaurants yet. Alerts start once the owner turns it on.";
  }
  return list
    .map((m) => `• <b>${esc(m.restaurantName)}</b> — ${BOT_PROFILE_LABELS[m.profile]}`)
    .join('\n');
}

async function sendHelp(
  token: string,
  chatId: string,
  userId: string,
  paused: boolean,
): Promise<void> {
  const [user, memberships] = await Promise.all([
    User.findById(userId).select('firstName lastName email').lean(),
    activeMemberships(userId),
  ]);
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'team member';
  const text = [
    '<b>Tablevera reservation bot</b>',
    `Connected as <b>${esc(name)}</b>:`,
    describeMemberships(memberships),
    '',
    'Use the buttons under each reservation to manage it:',
    '• <b>Front of house</b> — accept, seat, complete, cancel, no-show',
    '• <b>Host</b> — seat, complete, no-show',
    '• <b>Approver</b> — accept / reject pending bookings',
    '',
    `${BTN_ACTIVE} — reservations waiting on you`,
    `${paused ? BTN_RESUME : BTN_PAUSE} — ${paused ? 'start' : 'stop'} new alerts (buttons keep working)`,
    '/unlink — disconnect this chat',
  ].join('\n');
  await sendTelegramText(token, chatId, text, menuKeyboard(paused));
}

async function sendActiveReservations(
  token: string,
  chatId: string,
  userId: string,
): Promise<void> {
  const memberships = await activeMemberships(userId);
  const rows: Array<{ id: string; label: string }> = [];
  for (const m of memberships) {
    const reservations = await Reservation.find({
      restaurantId: new mongoose.Types.ObjectId(m.restaurantId),
      status: { $in: profileActiveStatuses(m.profile) },
    })
      .sort({ slotStart: 1 })
      .limit(MAX_LISTED)
      .select('status partySize slotStart')
      .lean();
    for (const r of reservations) {
      const when = r.slotStart
        ? new Date(r.slotStart).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : '';
      rows.push({
        id: String(r._id),
        label: `${m.restaurantName} · ${r.partySize}p · ${when} · ${reservationStatusLabel(String(r.status))}`.slice(
          0,
          60,
        ),
      });
    }
  }
  if (!rows.length) {
    await sendTelegramText(token, chatId, '🎉 No active reservations right now.');
    return;
  }
  await sendTelegramText(
    token,
    chatId,
    `<b>📋 Active reservations (${rows.length})</b>\nTap one to open it.`,
    {
      inline_keyboard: rows.map((r) => [{ text: r.label, callback_data: `v:${r.id}` }]),
    },
  );
}

async function handleStart(token: string, msg: TelegramMessage, payload: string): Promise<void> {
  const chatId = String(msg.chat.id);
  const displayName =
    (msg.from?.username ? `@${msg.from.username}` : null) ||
    [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') ||
    null;

  if (!payload) {
    const link = await findActiveTelegramLink(chatId);
    if (link) {
      await sendHelp(token, chatId, String(link.userId), link.paused);
    } else {
      await sendTelegramText(token, chatId, NOT_LINKED_TEXT);
    }
    return;
  }

  const result = await consumeTelegramLinkToken(payload, { chatId, displayName });
  if (!result.ok) {
    const why =
      result.reason === 'expired'
        ? 'This invite link has expired.'
        : result.reason === 'no_access'
          ? "This invite is no longer valid — you aren't on this restaurant's team anymore."
          : 'This invite link is invalid or was already used.';
    await sendTelegramText(
      token,
      chatId,
      `⚠️ ${why}\nAsk for a new link from the Tablevera dashboard → Notifications.`,
    );
    return;
  }

  const lines = [
    `✅ <b>Connected!</b> You'll get <b>${BOT_PROFILE_LABELS[result.member.profile]}</b> alerts for <b>${esc(result.restaurantName)}</b>.`,
  ];
  if (result.replacedUser) lines.push('This chat was previously connected to another account.');
  await sendTelegramText(token, chatId, lines.join('\n'), menuKeyboard(false));
  await sendHelp(token, chatId, result.member.userId, false);
}

async function handleMessage(token: string, msg: TelegramMessage): Promise<void> {
  const chatId = String(msg.chat.id);
  const text = (msg.text ?? '').trim();
  if (msg.chat.type !== 'private') {
    if (text.startsWith('/')) {
      await sendTelegramText(
        token,
        chatId,
        'Please message me in a private chat to manage reservations.',
      );
    }
    return;
  }

  const startMatch = /^\/start(?:@\w+)?(?:\s+(\S+))?/.exec(text);
  if (startMatch) {
    await handleStart(token, msg, startMatch[1] ?? '');
    return;
  }

  const links = await findActiveTelegramLinks(chatId);
  const link = links[0];
  if (!link) {
    await sendTelegramText(token, chatId, NOT_LINKED_TEXT);
    return;
  }
  const userId = String(link.userId);
  await MessengerLink.updateMany(
    { channel: 'TELEGRAM', chatId, isActive: true },
    { $set: { lastSeenAt: new Date() } },
  );

  if (text === BTN_ACTIVE || /^\/reservations\b/.test(text) || /^\/orders\b/.test(text)) {
    await sendActiveReservations(token, chatId, userId);
  } else if (text === BTN_PAUSE || /^\/pause\b/.test(text)) {
    await MessengerLink.updateMany(
      { channel: 'TELEGRAM', chatId, isActive: true },
      { $set: { paused: true } },
    );
    await sendTelegramText(
      token,
      chatId,
      "⏸ Alerts paused. You won't get new reservations here until you resume.",
      menuKeyboard(true),
    );
  } else if (text === BTN_RESUME || /^\/resume\b/.test(text)) {
    await MessengerLink.updateMany(
      { channel: 'TELEGRAM', chatId, isActive: true },
      { $set: { paused: false } },
    );
    await sendTelegramText(token, chatId, '▶️ Alerts resumed.', menuKeyboard(false));
  } else if (/^\/unlink\b/.test(text)) {
    await sendTelegramText(
      token,
      chatId,
      "Disconnect this chat from Tablevera? You'll stop receiving reservation alerts.",
      {
        inline_keyboard: [[{ text: 'Yes, disconnect', callback_data: 'm:unlink' }]],
      },
    );
  } else {
    await sendHelp(token, chatId, userId, links.some((l) => l.paused));
  }
}

async function handleCallback(token: string, cb: TelegramCallbackQuery): Promise<void> {
  const chatId = cb.message ? String(cb.message.chat.id) : String(cb.from.id);
  const messageId = cb.message ? String(cb.message.message_id) : '';
  const link = await findActiveTelegramLink(chatId);
  if (!link) {
    await answerTelegramCallback(token, cb.id, "This chat isn't connected to Tablevera.", true);
    return;
  }
  const userId = String(link.userId);

  if (cb.data === 'm:unlink') {
    await MessengerLink.updateMany(
      { channel: 'TELEGRAM', chatId, isActive: true },
      { $set: { isActive: false } },
    );
    await answerTelegramCallback(token, cb.id, 'Disconnected');
    await sendTelegramText(
      token,
      chatId,
      '👋 Disconnected. You can reconnect anytime from the Tablevera dashboard.',
      { remove_keyboard: true },
    );
    return;
  }

  const parsed = parseCallbackData(cb.data);
  if (!parsed) {
    await answerTelegramCallback(token, cb.id);
    return;
  }

  if (parsed.kind === 'view') {
    const card = await loadReservationCard(parsed.reservationId);
    if (!card) {
      await answerTelegramCallback(token, cb.id, 'Reservation not found', true);
      return;
    }
    const member = (await activeMemberships(userId)).find(
      (m) => m.restaurantId === card.restaurantId,
    );
    if (!member) {
      await answerTelegramCallback(token, cb.id, 'No access', true);
      return;
    }
    await sendReservationCard(token, card, member, chatId);
    await answerTelegramCallback(token, cb.id);
    return;
  }

  await handleReservationButton({
    token,
    chatId,
    messageId,
    callbackId: cb.id,
    userId,
    reservationId: parsed.reservationId,
    action: parsed.action,
    arg: parsed.arg,
  });
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const cfg = await getBotPlatformConfig();
  if (!cfg.telegramToken) return;
  const token = cfg.telegramToken;
  try {
    if (update.callback_query) {
      await handleCallback(token, update.callback_query);
    } else if (update.message) {
      await handleMessage(token, update.message);
    }
  } catch (err) {
    logger.warn({ err, updateId: update.update_id }, '[messenger-bot] update failed');
  }
}
