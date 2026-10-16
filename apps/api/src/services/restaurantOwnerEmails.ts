import { Invoice } from '../models/Invoice.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { notifyUser } from './notifications.js';
import { renderEmailTemplate } from './emailTemplates.js';

function formatAmount(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function dashboardUrl(path = '') {
  const base = (env.DASHBOARD_APP_URL || 'https://dashboard.tablevera.com').replace(/\/$/, '');
  return path ? `${base}${path.startsWith('/') ? path : `/${path}`}` : base;
}

/**
 * Welcome / onboarding email when a restaurant account is created (admin or partner self-signup).
 * Fire-and-forget safe: callers should not await failures into the create transaction.
 */
export async function notifyOwnerRestaurantCreated(params: {
  ownerId: string;
  restaurantId: string;
  restaurantName: string;
  plan?: string | null;
}) {
  const owner = await User.findById(params.ownerId);
  if (!owner?.email) {
    logger.warn(
      { ownerId: params.ownerId, restaurantId: params.restaurantId },
      '[restaurantOwnerEmails] restaurant_created skipped — owner has no email',
    );
    return { sent: false as const, reason: 'no_email' as const };
  }

  const invoice = await Invoice.findOne({ restaurantId: params.restaurantId }).sort({
    createdAt: -1,
  });
  const firstName = owner.firstName ?? owner.email.split('@')[0] ?? 'there';
  const planLabel = params.plan ? String(params.plan).toUpperCase() : 'None';

  const { subject, bodyHtml, bodyText } = await renderEmailTemplate('restaurant_created', {
    firstName,
    restaurantName: params.restaurantName,
    plan: planLabel,
    invoiceNumber: invoice?.number ?? '—',
    amount: invoice ? formatAmount(invoice.totalCents) : '—',
    dueDate: invoice?.dueDate ? formatDate(invoice.dueDate) : '—',
    billingUrl: dashboardUrl('/billing'),
  });

  await notifyUser(owner._id.toString(), {
    type: 'restaurant_created',
    title: subject,
    body: bodyText || `Your restaurant ${params.restaurantName} has been created on Tablevera.`,
    htmlBody: bodyHtml,
    data: {
      restaurantId: params.restaurantId,
      invoiceId: invoice?._id?.toString(),
    },
  });

  logger.info(
    { restaurantId: params.restaurantId, ownerId: owner._id.toString() },
    '[restaurantOwnerEmails] restaurant_created sent',
  );
  return { sent: true as const };
}

/** Sent when an admin approves a pending restaurant listing. */
export async function notifyOwnerRestaurantApproved(params: {
  ownerId: string;
  restaurantId: string;
  restaurantName: string;
}) {
  const owner = await User.findById(params.ownerId);
  if (!owner?.email) {
    logger.warn(
      { ownerId: params.ownerId, restaurantId: params.restaurantId },
      '[restaurantOwnerEmails] restaurant_approved skipped — owner has no email',
    );
    return { sent: false as const, reason: 'no_email' as const };
  }

  const firstName = owner.firstName ?? owner.email.split('@')[0] ?? 'there';
  const { subject, bodyHtml, bodyText } = await renderEmailTemplate('restaurant_approved', {
    firstName,
    restaurantName: params.restaurantName,
    dashboardUrl: dashboardUrl(),
  });

  await notifyUser(owner._id.toString(), {
    type: 'restaurant_approved',
    title: subject,
    body: bodyText || `${params.restaurantName} has been approved and is now live on Tablevera.`,
    htmlBody: bodyHtml,
    data: { restaurantId: params.restaurantId },
  });

  logger.info(
    { restaurantId: params.restaurantId, ownerId: owner._id.toString() },
    '[restaurantOwnerEmails] restaurant_approved sent',
  );
  return { sent: true as const };
}
