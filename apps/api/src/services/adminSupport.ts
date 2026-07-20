import crypto from 'node:crypto';
import type { UserRole } from '@reservations/shared';
import { env } from '../config/env.js';
import { StaffInvite } from '../models/StaffInvite.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { getPlatformConfig } from './platformConfig.js';
import { hashPassword, signAccessToken } from './auth.js';
import { notifyUser } from './notifications.js';
import { renderEmailTemplate } from './emailTemplates.js';

export async function startImpersonation(adminId: string, targetUserId: string) {
  if (adminId === targetUserId) throw new Error('Cannot impersonate yourself');
  const [admin, target] = await Promise.all([
    User.findById(adminId),
    User.findById(targetUserId),
  ]);
  if (!admin || admin.role !== 'admin') throw new Error('Forbidden');
  if (!target) throw new Error('User not found');
  if (target.role === 'admin') throw new Error('Cannot impersonate another admin');

  const accessToken = signAccessToken({
    sub: target._id.toString(),
    role: target.role,
    email: target.email ?? undefined,
    impersonatorId: admin._id.toString(),
  });

  // Short-lived: no refresh token for impersonation sessions
  return {
    accessToken,
    refreshToken: '',
    user: target,
    impersonator: admin,
    expiresInSeconds: 60 * 60,
  };
}

export async function inviteStaff(input: {
  email: string;
  firstName: string;
  lastName: string;
  role?: 'staff' | 'restaurant_owner';
  restaurantIds: string[];
  invitedById: string;
}) {
  const config = await getPlatformConfig();
  const role = (input.role || config.defaultStaffRole || 'staff') as 'staff' | 'restaurant_owner';
  if (!['staff', 'restaurant_owner'].includes(role)) {
    throw new Error('Invite role must be staff or restaurant_owner');
  }
  if (!input.restaurantIds.length) throw new Error('At least one restaurant is required');

  const restaurants = await Restaurant.find({ _id: { $in: input.restaurantIds } });
  if (restaurants.length !== input.restaurantIds.length) {
    throw new Error('One or more restaurants not found');
  }

  const email = input.email.toLowerCase();
  const token = crypto.randomUUID();
  const invite = await StaffInvite.create({
    email,
    firstName: input.firstName,
    lastName: input.lastName,
    role,
    restaurantIds: input.restaurantIds,
    token,
    invitedById: input.invitedById,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const inviteUrl = `${env.WEB_APP_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;
  const restaurantName = restaurants.map((r) => r.name).join(', ');

  let existing = await User.findOne({ email });
  if (existing) {
    await User.findByIdAndUpdate(existing._id, {
      $addToSet: { restaurantIds: { $each: input.restaurantIds } },
      role: existing.role === 'diner' ? role : existing.role,
    });
    invite.userId = existing._id;
    invite.acceptedAt = new Date();
    await invite.save();

    const rendered = await renderEmailTemplate('staff_invite', {
      firstName: existing.firstName,
      restaurantName,
      role,
      inviteUrl,
    });
    await notifyUser(existing._id.toString(), {
      type: 'staff_invite',
      title: rendered.subject,
      body: rendered.bodyText,
    });
  } else {
    // Create pending account with temp password; invitee resets via link flow
    const tempPassword = crypto.randomBytes(12).toString('base64url');
    existing = await User.create({
      email,
      passwordHash: await hashPassword(tempPassword),
      firstName: input.firstName,
      lastName: input.lastName,
      role: role as UserRole,
      restaurantIds: input.restaurantIds,
      emailVerified: false,
    });
    invite.userId = existing._id;
    await invite.save();

    const rendered = await renderEmailTemplate('staff_invite', {
      firstName: input.firstName,
      restaurantName,
      role,
      inviteUrl,
    });
    await notifyUser(existing._id.toString(), {
      type: 'staff_invite',
      title: rendered.subject,
      body: `${rendered.bodyText}\n\nTemporary password: ${tempPassword}\nPlease reset after signing in.`,
    });
  }

  return { invite, user: existing, inviteUrl };
}

export async function assignUserToRestaurants(input: {
  userId: string;
  restaurantIds: string[];
  role?: UserRole;
}) {
  const user = await User.findById(input.userId);
  if (!user) throw new Error('User not found');
  const restaurants = await Restaurant.find({ _id: { $in: input.restaurantIds } });
  if (restaurants.length !== input.restaurantIds.length) {
    throw new Error('One or more restaurants not found');
  }
  await User.findByIdAndUpdate(user._id, {
    $addToSet: { restaurantIds: { $each: input.restaurantIds } },
    ...(input.role ? { role: input.role } : {}),
  });
  const updated = await User.findById(user._id);
  return updated!;
}

export async function removeUserFromRestaurant(userId: string, restaurantId: string) {
  const updated = await User.findByIdAndUpdate(
    userId,
    { $pull: { restaurantIds: restaurantId } },
    { new: true },
  );
  if (!updated) throw new Error('User not found');
  return updated;
}
