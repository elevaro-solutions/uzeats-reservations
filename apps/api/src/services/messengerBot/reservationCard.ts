import type { TelegramInlineButton, TelegramInlineKeyboard, TelegramTextEntity } from './telegramApi.js';
import {
  BOT_ACTIONS,
  CANCEL_REASONS,
  availableActions,
  reservationStatusLabel,
  type BotActionCode,
  type BotViewer,
} from './profiles.js';

export type ReservationCardData = {
  reservationId: string;
  restaurantId: string;
  status: string;
  restaurantName?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  partySize: number;
  slotStart: Date;
  slotEnd?: Date | null;
  occasion?: string | null;
  guestNotes?: string | null;
  tableLabels?: string[] | null;
  source?: string | null;
  cancellationReason?: string | null;
  requiresManualApproval?: boolean;
  dashboardUrl?: string | null;
};

export function callbackData(reservationId: string, action: string): string {
  return `r:${reservationId}:${action}`;
}

/** Parses `r:<reservationId>:<action>[:<arg>]` and `v:<reservationId>` payloads. */
export function parseCallbackData(
  data: string | undefined,
):
  | { kind: 'reservation'; reservationId: string; action: string; arg?: string }
  | { kind: 'view'; reservationId: string }
  | null {
  if (!data) return null;
  const parts = data.split(':');
  const id = parts[1];
  const action = parts[2];
  if (parts[0] === 'v' && id && /^[a-f0-9]{24}$/i.test(id)) {
    return { kind: 'view', reservationId: id };
  }
  if (parts[0] !== 'r' || !id || !/^[a-f0-9]{24}$/i.test(id) || !action) return null;
  return { kind: 'reservation', reservationId: id, action, arg: parts[3] };
}

export function isTelegramKeyboardUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return false;
    }
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export function usE164(phone: string): string | null {
  const raw = phone.trim();
  if (!raw) return null;
  const hadPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) return null;
  if (!hadPlus && digits.length === 10) return `+1${digits}`;
  if (!hadPlus && digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

export type ReservationCardMessage = { text: string; entities: TelegramTextEntity[] };

class CardText {
  text = '';
  entities: TelegramTextEntity[] = [];

  add(chunk: string, entity?: Pick<TelegramTextEntity, 'type' | 'url'>): void {
    if (!chunk) return;
    const offset = this.text.length;
    this.text += chunk;
    if (entity) {
      this.entities.push({
        type: entity.type,
        offset,
        length: chunk.length,
        ...(entity.url ? { url: entity.url } : {}),
      });
    }
  }

  line(chunk = '', entity?: Pick<TelegramTextEntity, 'type' | 'url'>): void {
    this.add(chunk, entity);
    this.text += '\n';
  }
}

function formatSlot(date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function dashboardHref(card: ReservationCardData): string | null {
  const url = card.dashboardUrl?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return url;
}

export function renderReservationCardMessage(
  card: ReservationCardData,
  _viewer: BotViewer,
): ReservationCardMessage {
  const out = new CardText();
  const orderUrl = dashboardHref(card);

  if (card.restaurantName?.trim()) {
    out.add('🏪 ');
    out.line(card.restaurantName.trim(), { type: 'bold' });
  }
  out.line(reservationStatusLabel(card.status), { type: 'bold' });
  if (card.status === 'cancelled' && card.cancellationReason?.trim()) {
    out.line(`Reason: ${card.cancellationReason.trim()}`, { type: 'bold' });
  }
  if (card.requiresManualApproval && card.status === 'pending') {
    out.line('Needs your approval', { type: 'italic' });
  }

  const head = [
    card.guestName?.trim() || 'Guest',
    `party of ${card.partySize}`,
    formatSlot(card.slotStart),
  ];
  const headLine = head.join(' · ');
  out.line(
    headLine,
    orderUrl && isTelegramKeyboardUrl(orderUrl) ? { type: 'text_link', url: orderUrl } : undefined,
  );

  if (card.guestPhone?.trim()) {
    const e164 = usE164(card.guestPhone);
    if (e164) {
      out.add('📞 ');
      out.line(e164, { type: 'phone_number' });
    } else {
      out.line(`📞 ${card.guestPhone.trim()}`);
    }
  }

  if (card.tableLabels?.length) {
    out.line(`🪑 ${card.tableLabels.join(', ')}`);
  }
  if (card.occasion && card.occasion !== 'none') {
    out.line(`🎉 ${card.occasion}`);
  }
  if (card.guestNotes?.trim()) {
    out.line(`📝 ${card.guestNotes.trim()}`);
  }
  if (card.source) {
    out.line(`Source: ${card.source}`);
  }

  return { text: out.text.trimEnd(), entities: out.entities };
}

export function renderReservationCardKeyboard(
  card: ReservationCardData,
  viewer: BotViewer,
): TelegramInlineKeyboard {
  const actions = availableActions({ status: card.status }, viewer);
  const rows: TelegramInlineButton[][] = [];
  let row: TelegramInlineButton[] = [];
  for (const code of actions) {
    const btn: TelegramInlineButton = {
      text: BOT_ACTIONS[code].label,
      callback_data: callbackData(card.reservationId, code),
    };
    row.push(btn);
    if (row.length === 2) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) rows.push(row);

  const url = dashboardHref(card);
  if (url && isTelegramKeyboardUrl(url)) {
    rows.push([{ text: 'Open in dashboard', url }]);
  }
  return { inline_keyboard: rows };
}

export function renderCancelReasonKeyboard(reservationId: string): TelegramInlineKeyboard {
  return {
    inline_keyboard: [
      ...CANCEL_REASONS.map(
        (reason, i): TelegramInlineButton[] => [
          { text: reason, callback_data: `r:${reservationId}:rj:${i}` },
        ],
      ),
      [{ text: '← Back', callback_data: callbackData(reservationId, 'back') }],
    ],
  };
}
