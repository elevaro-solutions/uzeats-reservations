import {
  htmlToPlainText,
  restaurantInquiryInputSchema,
  type RestaurantInquiryInput,
} from '@reservations/shared';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { Restaurant } from '../models/Restaurant.js';
import { RestaurantInquiry } from '../models/RestaurantInquiry.js';
import type { UserDocument } from '../models/User.js';
import { User } from '../models/User.js';
import { sendEmail, notifyRestaurantManagers } from './notifications.js';
import {
  emailDetailBox,
  emailGreeting,
  emailParagraph,
  emailSignature,
  escapeHtml,
} from './emailBranding.js';

type InquiryContext = {
  user?: UserDocument | null;
};

function resolveSender(
  input: RestaurantInquiryInput,
  ctx: InquiryContext,
): { name: string; email: string; userId?: string } {
  if (ctx.user?.email) {
    const name = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ').trim();
    return {
      name: name || ctx.user.email,
      email: ctx.user.email,
      userId: ctx.user._id.toString(),
    };
  }
  if (!input.name?.trim() || !input.email?.trim()) {
    throw new ValidationError('Name and email are required to message this restaurant');
  }
  return { name: input.name.trim(), email: input.email.trim().toLowerCase() };
}

/** The inquiry is already stored (Partner Hub inbox), so a failed email must not fail the send. */
async function sendInquiryEmail(
  to: string | null | undefined,
  subject: string,
  body: string,
  htmlBody: string,
  context: Record<string, unknown>,
) {
  if (!to?.trim()) return;
  try {
    await sendEmail(to, subject, body, { htmlBody });
  } catch (err) {
    logger.warn({ err, ...context }, '[inquiry] email not delivered');
  }
}

export async function sendRestaurantInquiry(rawInput: unknown, ctx: InquiryContext) {
  const parsed = restaurantInquiryInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid message');
  }
  const input = parsed.data;
  const restaurant = await Restaurant.findById(input.restaurantId).lean();
  if (!restaurant || restaurant.status !== 'approved') {
    throw new NotFoundError('Restaurant');
  }

  const sender = resolveSender(input, ctx);
  const messageText = htmlToPlainText(input.message);
  if (!messageText) throw new ValidationError('Write a message');

  const inquiry = await RestaurantInquiry.create({
    restaurantId: input.restaurantId,
    senderName: sender.name,
    senderEmail: sender.email,
    userId: sender.userId,
    message: input.message.trim(),
  });
  const logContext = {
    restaurantId: input.restaurantId,
    inquiryId: inquiry._id.toString(),
  };

  const owner = await User.findById(restaurant.ownerId).select('email').lean();

  const subject = `[Tablevera] Message about ${restaurant.name}`;
  const body = [
    `New message for ${restaurant.name}`,
    ``,
    `From: ${sender.name} <${sender.email}>`,
    ``,
    messageText,
    ``,
    `— Sent via Tablevera`,
  ].join('\n');

  const htmlBody = [
    emailParagraph(`<strong>New message for ${escapeHtml(restaurant.name)}</strong>`),
    emailDetailBox([
      { label: 'From', value: `${sender.name} (${sender.email})` },
      { label: 'Restaurant', value: restaurant.name },
    ]),
    emailParagraph(`<span style="white-space:pre-wrap">${escapeHtml(messageText)}</span>`),
  ].join('');

  await sendInquiryEmail(owner?.email, subject, body, htmlBody, logContext);

  const confirmSubject = `Your message was sent to ${restaurant.name}`;
  const confirmBody = [
    `Hi ${sender.name},`,
    ``,
    `Your message to ${restaurant.name} has been delivered. The restaurant will respond to you directly at ${sender.email} if needed.`,
    ``,
    `Your message:`,
    messageText,
    ``,
    `— The Tablevera team`,
  ].join('\n');

  const confirmHtml = [
    emailGreeting(sender.name),
    emailParagraph(
      `Your message to <strong>${escapeHtml(restaurant.name)}</strong> has been delivered. The restaurant will respond to you directly at <strong>${escapeHtml(sender.email)}</strong> if needed.`,
    ),
    emailParagraph('<strong>Your message:</strong>'),
    emailParagraph(`<span style="white-space:pre-wrap">${escapeHtml(messageText)}</span>`),
    emailSignature(),
  ].join('');

  await sendInquiryEmail(sender.email, confirmSubject, confirmBody, confirmHtml, logContext);

  try {
    await notifyRestaurantManagers(input.restaurantId, {
      type: 'restaurant_inquiry',
      title: 'New website message',
      body: `${sender.name}: ${messageText.slice(0, 120)}`,
      data: { restaurantId: input.restaurantId, inquiryId: inquiry._id.toString() },
    });
  } catch (err) {
    logger.warn({ err, ...logContext }, '[inquiry] manager notification failed');
  }

  return {
    success: true,
    message: `Your message was sent to ${restaurant.name}.`,
  };
}
