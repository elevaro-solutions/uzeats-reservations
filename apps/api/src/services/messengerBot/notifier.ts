import mongoose from 'mongoose';
import { MessengerLink, Restaurant } from '../../models/index.js';
import { logger } from '../../lib/logger.js';
import { onReservationEvent, type ReservationEvent } from '../reservationEvents.js';
import { getBotPlatformConfig, restaurantBotActive } from './config.js';
import { refreshReservationCards, replyUnderCard, sendReservationCard } from './delivery.js';
import { restaurantBotMembers } from './members.js';
import { escapeTelegramHtml as esc } from './telegramApi.js';
import { loadReservationCard } from './reservationCardData.js';
import { profileWantsNewCard, type BotActionCode, type BotProfile } from './profiles.js';

const ACTOR_SUPPRESS_MS = 30_000;
const recentActors = new Map<string, number>();

export function markActorChat(reservationId: string, chatId: string): void {
  recentActors.set(`${reservationId}:${chatId}`, Date.now() + ACTOR_SUPPRESS_MS);
}

function isRecentActor(reservationId: string, chatId: string): boolean {
  const key = `${reservationId}:${chatId}`;
  const until = recentActors.get(key);
  if (!until) return false;
  if (until < Date.now()) {
    recentActors.delete(key);
    return false;
  }
  return true;
}

function pingText(
  status: string,
  guestName: string | null | undefined,
  restaurantName?: string | null,
  cancellationReason?: string | null,
): string | null {
  const guest = guestName?.trim() ? `<b>${esc(guestName.trim())}</b>` : 'a guest';
  const store = restaurantName?.trim() ? ` · <b>${esc(restaurantName.trim())}</b>` : '';
  if (status === 'cancelled') {
    const why = cancellationReason?.trim()
      ? ` Reason: <b>${esc(cancellationReason.trim())}</b>.`
      : '';
    return `❌ Reservation for ${guest}${store} was cancelled.${why}`;
  }
  if (status === 'no_show') {
    return `👻 ${guest}${store} marked as no-show.`;
  }
  if (status === 'confirmed') {
    return `✅ Reservation for ${guest}${store} confirmed.`;
  }
  return null;
}

function profileWantsPing(profile: BotProfile, status: string): boolean {
  if (status === 'cancelled' || status === 'no_show') return true;
  return status === 'confirmed' && (profile === 'FOH' || profile === 'HOST');
}

async function processReservationEvent(evt: ReservationEvent): Promise<void> {
  const cfg = await getBotPlatformConfig();
  if (!cfg.enabled || !cfg.telegramToken) return;
  const token = cfg.telegramToken;

  const restaurant = await Restaurant.findById(evt.restaurantId)
    .select('messengerBotAccess messengerBotEnabled')
    .lean();
  if (!restaurantBotActive(cfg, restaurant)) return;

  const card = await loadReservationCard(evt.reservationId);
  if (!card) return;

  const existing = await refreshReservationCards(token, card);
  const chatsWithCard = new Set(existing.map((e) => e.chatId));

  if (evt.type === 'RESERVATION_STATUS_CHANGED') {
    for (const row of existing) {
      if (!profileWantsPing(row.profile, card.status)) continue;
      if (isRecentActor(card.reservationId, row.chatId)) continue;
      const text = pingText(
        card.status,
        card.guestName,
        card.restaurantName,
        card.cancellationReason,
      );
      if (text) await replyUnderCard(token, row.chatId, row.messageId, text);
    }
  }

  const members = await restaurantBotMembers(card.restaurantId);
  if (!members.length) return;
  const memberByUser = new Map(members.map((m) => [m.userId, m]));

  const links = await MessengerLink.find({
    channel: 'TELEGRAM',
    restaurantId: new mongoose.Types.ObjectId(card.restaurantId),
    isActive: true,
    paused: false,
    userId: { $in: members.map((m) => new mongoose.Types.ObjectId(m.userId)) },
  })
    .select('chatId userId profileOverride allowedActions')
    .lean();

  for (const link of links) {
    if (chatsWithCard.has(link.chatId)) continue;
    const member = memberByUser.get(String(link.userId));
    if (!member) continue;
    const profile = (link.profileOverride as BotProfile | null | undefined) ?? member.profile;
    if (!profileWantsNewCard(profile, card.status)) continue;
    chatsWithCard.add(link.chatId);
    await sendReservationCard(token, card, { ...member, profile }, link.chatId, {
      profileOverride: (link.profileOverride as BotProfile | null | undefined) ?? null,
      allowedActions: (link.allowedActions as BotActionCode[] | null) ?? null,
    });
  }
}

const reservationQueues = new Map<string, Promise<void>>();

function enqueue(evt: ReservationEvent): void {
  const prev = reservationQueues.get(evt.reservationId) ?? Promise.resolve();
  const next = prev
    .then(() => processReservationEvent(evt))
    .catch((err) =>
      logger.warn(
        { err, reservationId: evt.reservationId },
        '[messenger-bot] reservation event failed',
      ),
    )
    .finally(() => {
      if (reservationQueues.get(evt.reservationId) === next) {
        reservationQueues.delete(evt.reservationId);
      }
    });
  reservationQueues.set(evt.reservationId, next);
}

let subscribed = false;

export function startMessengerBotNotifier(): void {
  if (subscribed) return;
  subscribed = true;
  onReservationEvent((evt) => {
    if (
      evt.type !== 'RESERVATION_CREATED' &&
      evt.type !== 'RESERVATION_STATUS_CHANGED' &&
      evt.type !== 'RESERVATION_UPDATED' &&
      evt.type !== 'RESERVATION_NEEDS_APPROVAL'
    ) {
      return;
    }
    enqueue(evt);
  });
}
