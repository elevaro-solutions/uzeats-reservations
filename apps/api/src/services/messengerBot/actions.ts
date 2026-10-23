import mongoose from 'mongoose';
import { MessengerLink, Restaurant } from '../../models/index.js';
import { logger } from '../../lib/logger.js';
import { updateReservationStatus } from '../reservations.js';
import { getBotPlatformConfig, restaurantBotActive } from './config.js';
import { editReservationCardMessage } from './delivery.js';
import { viewerForLink } from './linking.js';
import { botMemberForUser, type BotMember } from './members.js';
import { markActorChat } from './notifier.js';
import { renderCancelReasonKeyboard } from './reservationCard.js';
import { loadReservationCard } from './reservationCardData.js';
import {
  BOT_ACTIONS,
  CANCEL_REASONS,
  CANCELLABLE_STATUSES,
  canPerformAction,
  reservationStatusLabel,
  type BotActionCode,
  type BotProfile,
} from './profiles.js';
import { answerTelegramCallback } from './telegramApi.js';

const DONE_TOAST: Record<string, string> = {
  confirmed: 'Reservation accepted',
  seated: 'Marked as seated',
  completed: 'Marked as completed',
  cancelled: 'Reservation cancelled',
  no_show: 'Marked as no-show',
};

export type ReservationButtonInput = {
  token: string;
  chatId: string;
  messageId: string;
  callbackId: string;
  userId: string;
  reservationId: string;
  action: string;
  arg?: string;
};

async function applyStatus(
  reservationId: string,
  status: string,
  member: BotMember,
  reason?: string,
): Promise<void> {
  await updateReservationStatus(reservationId, status, member.userId, reason);
}

/** Handles an inline button press on a reservation card. */
export async function handleReservationButton(input: ReservationButtonInput): Promise<void> {
  const { token, chatId, messageId, callbackId, reservationId } = input;
  const answer = (text?: string, alert = false) =>
    answerTelegramCallback(token, callbackId, text, alert);

  const card = await loadReservationCard(reservationId);
  if (!card) {
    await answer('This reservation no longer exists.', true);
    return;
  }

  const [cfg, restaurant] = await Promise.all([
    getBotPlatformConfig(),
    Restaurant.findById(card.restaurantId)
      .select('messengerBotAccess messengerBotEnabled')
      .lean(),
  ]);
  if (!restaurantBotActive(cfg, restaurant)) {
    await answer('The bot is turned off for this restaurant.', true);
    return;
  }

  const member = await botMemberForUser(card.restaurantId, input.userId);
  if (!member) {
    await answer("You no longer have access to this restaurant's reservations.", true);
    await editReservationCardMessage(token, card, { profile: 'FOH' }, chatId, messageId, {
      inline_keyboard: [],
    });
    return;
  }
  const link = await MessengerLink.findOne({
    channel: 'TELEGRAM',
    chatId,
    restaurantId: new mongoose.Types.ObjectId(card.restaurantId),
    isActive: true,
  })
    .select('profileOverride allowedActions')
    .lean();
  const viewer = viewerForLink(member, {
    profileOverride: (link?.profileOverride as BotProfile | null | undefined) ?? null,
    allowedActions: (link?.allowedActions as BotActionCode[] | null | undefined) ?? null,
  });
  const actingMember: BotMember = { ...member, profile: viewer.profile };
  const state = { status: card.status };

  const showFresh = async (toast?: string) => {
    const fresh = (await loadReservationCard(reservationId)) ?? card;
    await editReservationCardMessage(token, fresh, viewer, chatId, messageId);
    await answer(toast);
  };
  const stale = () => showFresh(`Already: ${reservationStatusLabel(card.status)}`);

  if (input.action === 'back') {
    await showFresh();
    return;
  }

  if (input.action === 'reject' || input.action === 'cancel') {
    if (!canPerformAction(input.action, state, viewer)) {
      await stale();
      return;
    }
    await editReservationCardMessage(
      token,
      card,
      viewer,
      chatId,
      messageId,
      renderCancelReasonKeyboard(reservationId),
    );
    await answer('Choose a reason');
    return;
  }

  try {
    if (input.action === 'rj') {
      const reason = CANCEL_REASONS[Number(input.arg)];
      if (
        !reason ||
        !CANCELLABLE_STATUSES.includes(card.status as (typeof CANCELLABLE_STATUSES)[number]) ||
        !(
          canPerformAction('reject', state, viewer) || canPerformAction('cancel', state, viewer)
        )
      ) {
        await stale();
        return;
      }
      markActorChat(reservationId, chatId);
      await applyStatus(reservationId, 'cancelled', actingMember, reason);
      await showFresh(DONE_TOAST.cancelled);
      return;
    }

    const code = input.action as BotActionCode;
    const rule = BOT_ACTIONS[code];
    if (!rule?.to) {
      await answer();
      return;
    }
    if (!canPerformAction(code, state, viewer)) {
      await stale();
      return;
    }

    markActorChat(reservationId, chatId);
    await applyStatus(reservationId, rule.to, actingMember);
    await showFresh(DONE_TOAST[rule.to] ?? 'Updated');
  } catch (err) {
    logger.warn({ err, reservationId, action: input.action }, '[messenger-bot] action failed');
    await answer(err instanceof Error ? err.message : 'Action failed', true);
    await showFresh();
  }
}
