import {
  formatMessageDayLabel,
  getMessageDayKey,
} from "./message-display.helpers";

export type MessageGroupItem = {
  senderType: string;
  createdAt: string;
};

export type MessageGroupFlags = {
  showDayDivider: boolean;
  dayLabel: string;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
};

export function getMessageGroupFlags(
  messages: MessageGroupItem[],
  index: number,
): MessageGroupFlags {
  const item = messages[index];
  const dayKey = getMessageDayKey(item.createdAt);
  const prev = index > 0 ? messages[index - 1] : null;
  const next = index < messages.length - 1 ? messages[index + 1] : null;
  const prevDayKey = prev ? getMessageDayKey(prev.createdAt) : null;
  const nextDayKey = next ? getMessageDayKey(next.createdAt) : null;

  return {
    showDayDivider: dayKey !== prevDayKey,
    dayLabel: formatMessageDayLabel(item.createdAt),
    isFirstInGroup:
      !prev ||
      prev.senderType !== item.senderType ||
      prevDayKey !== dayKey,
    isLastInGroup:
      !next ||
      next.senderType !== item.senderType ||
      nextDayKey !== dayKey,
  };
}
