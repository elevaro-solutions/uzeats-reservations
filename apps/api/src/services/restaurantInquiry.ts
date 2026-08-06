import { restaurantInquiryInputSchema, type RestaurantInquiryInput } from '@reservations/shared';
import { Restaurant } from '../models/Restaurant.js';
import { RestaurantInquiry } from '../models/RestaurantInquiry.js';
import type { UserDocument } from '../models/User.js';
import { User } from '../models/User.js';
import { sendEmail, notifyRestaurantStaff } from './notifications.js';
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
    throw new Error('Name and email are required to message this restaurant');
  }
  return { name: input.name.trim(), email: input.email.trim().toLowerCase() };
}

export async function sendRestaurantInquiry(rawInput: unknown, ctx: InquiryContext) {
  const input = restaurantInquiryInputSchema.parse(rawInput);
  const restaurant = await Restaurant.findById(input.restaurantId).lean();
  if (!restaurant || restaurant.status !== 'approved') {
    throw new Error('Restaurant not found');
  }

  const owner = await User.findById(restaurant.ownerId).lean();
  if (!owner?.email) {
    throw new Error('This restaurant is not accepting messages right now');
  }

  const sender = resolveSender(input, ctx);

  const inquiry = await RestaurantInquiry.create({
    restaurantId: input.restaurantId,
    senderName: sender.name,
    senderEmail: sender.email,
    userId: sender.userId,
    message: input.message.trim(),
  });

  const subject = `[Tablevera] Message about ${restaurant.name}`;
  const body = [
    `New message for ${restaurant.name}`,
    ``,
    `From: ${sender.name} <${sender.email}>`,
    ``,
    input.message,
    ``,
    `— Sent via Tablevera`,
  ].join('\n');

  const htmlBody = [
    emailParagraph(`<strong>New message for ${escapeHtml(restaurant.name)}</strong>`),
    emailDetailBox([
      { label: 'From', value: `${sender.name} (${sender.email})` },
      { label: 'Restaurant', value: restaurant.name },
    ]),
    emailParagraph(`<span style="white-space:pre-wrap">${escapeHtml(input.message)}</span>`),
  ].join('');

  await sendEmail(owner.email, subject, body, { htmlBody });

  const confirmSubject = `Your message was sent to ${restaurant.name}`;
  const confirmBody = [
    `Hi ${sender.name},`,
    ``,
    `Your message to ${restaurant.name} has been delivered. The restaurant will respond to you directly at ${sender.email} if needed.`,
    ``,
    `Your message:`,
    input.message,
    ``,
    `— The Tablevera team`,
  ].join('\n');

  const confirmHtml = [
    emailGreeting(sender.name),
    emailParagraph(
      `Your message to <strong>${escapeHtml(restaurant.name)}</strong> has been delivered. The restaurant will respond to you directly at <strong>${escapeHtml(sender.email)}</strong> if needed.`,
    ),
    emailParagraph('<strong>Your message:</strong>'),
    emailParagraph(`<span style="white-space:pre-wrap">${escapeHtml(input.message)}</span>`),
    emailSignature(),
  ].join('');

  await sendEmail(sender.email, confirmSubject, confirmBody, { htmlBody: confirmHtml });

  await notifyRestaurantStaff(input.restaurantId, {
    type: 'restaurant_inquiry',
    title: 'New website message',
    body: `${sender.name}: ${input.message.slice(0, 120)}`,
    data: { restaurantId: input.restaurantId, inquiryId: inquiry._id.toString() },
  });

  return {
    success: true,
    message: `Your message was sent to ${restaurant.name}.`,
  };
}
