import crypto from 'node:crypto';
import { isPlatformAdmin, type UserRole } from '@reservations/shared';
import { env } from '../config/env.js';
import { ManagerInvite } from '../models/ManagerInvite.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { getPlatformConfig } from './platformConfig.js';
import { hashPassword, issueTokens, signAccessToken } from './auth.js';
import { generateUniqueReferralCode } from '../lib/referralCode.js';
import { notifyUser } from './notifications.js';
import { renderEmailTemplate } from './emailTemplates.js';
import { emailNotice } from './emailBranding.js';
import {
  assertManagerSeatsAvailable,
  wouldConsumeManagerSeat,
} from './managerSeats.js';

export async function startImpersonation(adminId: string, targetUserId: string) {
  if (adminId === targetUserId) throw new Error('Cannot impersonate yourself');
  const [admin, target] = await Promise.all([
    User.findById(adminId),
    User.findById(targetUserId),
  ]);
  if (!admin || !isPlatformAdmin(admin.role)) throw new Error('Forbidden');
  if (!target) throw new Error('User not found');
  if (isPlatformAdmin(target.role)) throw new Error('Cannot impersonate another platform admin');

  const accessToken = signAccessToken(
    {
      sub: target._id.toString(),
      role: target.role,
      email: target.email ?? undefined,
      impersonatorId: admin._id.toString(),
    },
    '1h',
  );

  // Short-lived: no refresh token for impersonation sessions
  return {
    accessToken,
    refreshToken: '',
    user: target,
    impersonator: admin,
    expiresInSeconds: 60 * 60,
  };
}

export async function inviteManager(input: {
  email: string;
  firstName: string;
  lastName: string;
  role?: 'manager' | 'restaurant_owner';
  restaurantIds: string[];
  invitedById: string;
}) {
  const config = await getPlatformConfig();
  const role = (input.role || config.defaultManagerRole || 'manager') as 'manager' | 'restaurant_owner';
  if (!['manager', 'restaurant_owner'].includes(role)) {
    throw new Error('Invite role must be manager or restaurant_owner');
  }
  if (!input.restaurantIds.length) throw new Error('At least one restaurant is required');

  const restaurants = await Restaurant.find({ _id: { $in: input.restaurantIds } });
  if (restaurants.length !== input.restaurantIds.length) {
    throw new Error('One or more restaurants not found');
  }

  const email = input.email.toLowerCase();
  const existingBefore = await User.findOne({ email });

  // Manager seats apply to `manager` invites. Skip restaurants the user already manages.
  if (role === 'manager') {
    for (const restaurantId of input.restaurantIds) {
      if (existingBefore) {
        const consumes = await wouldConsumeManagerSeat(
          restaurantId,
          existingBefore._id.toString(),
          'manager',
        );
        if (!consumes) continue;
      }
      await assertManagerSeatsAvailable(restaurantId, { excludeEmails: [email] });
    }
  }

  const token = crypto.randomUUID();
  const invite = await ManagerInvite.create({
    email,
    firstName: input.firstName,
    lastName: input.lastName,
    role,
    restaurantIds: input.restaurantIds,
    token,
    invitedById: input.invitedById,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const inviteUrl = `${(env.DASHBOARD_APP_URL || env.WEB_APP_URL || 'http://localhost:3001').replace(/\/$/, '')}/accept-invite?token=${token}`;
  const restaurantName = restaurants.map((r) => r.name).join(', ');

  let existing = existingBefore;
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
      htmlBody: rendered.bodyHtml,
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
      htmlBody: `${rendered.bodyHtml}${emailNotice(`<strong>Temporary password:</strong> ${tempPassword}<br />Please reset your password after signing in.`)}`,
    });
  }

  return { invite, user: existing, inviteUrl };
}

export async function adminCreateOwnerUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  const email = input.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new Error('Email already registered');

  const user = await User.create({
    email,
    passwordHash: await hashPassword(input.password),
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    role: 'restaurant_owner' as UserRole,
    emailVerified: false,
    referralCode: await generateUniqueReferralCode(input.firstName),
  });
  return user;
}

const CREATABLE_ACCOUNT_ROLES = [
  'diner',
  'restaurant_owner',
  'manager',
  'admin',
  'account_manager',
] as const;
type CreatableAccountRole = (typeof CREATABLE_ACCOUNT_ROLES)[number];

export async function adminCreateUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: CreatableAccountRole;
  restaurantIds?: string[];
  emailVerified?: boolean;
}) {
  if (!(CREATABLE_ACCOUNT_ROLES as readonly string[]).includes(input.role)) {
    throw new Error('Invalid role for account creation');
  }

  const email = input.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new Error('Email already registered');
  if (input.phone) {
    const phoneTaken = await User.findOne({ phone: input.phone });
    if (phoneTaken) throw new Error('Phone already in use');
  }

  const restaurantIds =
    input.role === 'diner' || input.role === 'admin' || input.role === 'account_manager'
      ? []
      : (input.restaurantIds ?? []);
  if (input.role === 'manager' && restaurantIds.length === 0) {
    throw new Error('Manager accounts require at least one restaurant');
  }
  if (restaurantIds.length) {
    const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } });
    if (restaurants.length !== restaurantIds.length) {
      throw new Error('One or more restaurants not found');
    }
  }
  if (input.role === 'manager') {
    for (const restaurantId of restaurantIds) {
      await assertManagerSeatsAvailable(restaurantId);
    }
  }

  return User.create({
    email,
    passwordHash: await hashPassword(input.password),
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    role: input.role as UserRole,
    restaurantIds,
    emailVerified: input.emailVerified ?? false,
    referralCode: await generateUniqueReferralCode(input.firstName),
  });
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

  const nextRole = (input.role ?? user.role) as string;
  if (nextRole === 'manager') {
    for (const restaurantId of input.restaurantIds) {
      const consumes = await wouldConsumeManagerSeat(
        restaurantId,
        input.userId,
        nextRole,
      );
      if (!consumes) continue;
      await assertManagerSeatsAvailable(restaurantId, {
        excludeUserIds: [input.userId],
      });
    }
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

const INVITE_ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  restaurant_owner: 'Owner',
};

export type ManagerInvitePreview = {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleLabel: string;
  restaurantName: string;
  status: 'pending' | 'accepted' | 'expired';
  needsPassword: boolean;
};

export async function getManagerInviteByToken(token: string): Promise<ManagerInvitePreview> {
  const invite = await ManagerInvite.findOne({ token: token.trim() });
  if (!invite) throw new Error('Invite not found');

  const restaurants = await Restaurant.find({ _id: { $in: invite.restaurantIds } });
  const restaurantName = restaurants.map((r) => r.name).join(', ') || 'your restaurant';
  const expired = invite.expiresAt.getTime() < Date.now();
  const accepted = Boolean(invite.acceptedAt);

  let status: ManagerInvitePreview['status'] = 'pending';
  if (accepted) status = 'accepted';
  else if (expired) status = 'expired';

  return {
    email: invite.email,
    firstName: invite.firstName,
    lastName: invite.lastName,
    role: invite.role,
    roleLabel: INVITE_ROLE_LABELS[invite.role] ?? invite.role,
    restaurantName,
    status,
    needsPassword: status === 'pending',
  };
}

/**
 * Completes a pending manager invite: sets the invitee's password, marks the invite
 * accepted, and returns auth tokens so the Partner Hub can sign them in.
 */
export async function acceptManagerInvite(token: string, password: string) {
  const invite = await ManagerInvite.findOne({ token: token.trim() });
  if (!invite) throw new Error('Invite not found');
  if (invite.acceptedAt) throw new Error('This invitation has already been accepted. Please sign in.');
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new Error('This invitation has expired. Ask your restaurant owner to send a new one.');
  }

  let user = invite.userId ? await User.findById(invite.userId) : null;
  if (!user) {
    user = await User.findOne({ email: invite.email });
  }
  if (!user) {
    user = await User.create({
      email: invite.email,
      passwordHash: await hashPassword(password),
      firstName: invite.firstName,
      lastName: invite.lastName,
      role: invite.role as UserRole,
      restaurantIds: invite.restaurantIds,
      emailVerified: true,
    });
  } else {
    user.passwordHash = await hashPassword(password);
    user.emailVerified = true;
    user.refreshTokens = [];
    user.refreshTokenGrace = undefined;
    if (user.role === 'diner') user.role = invite.role as UserRole;
    const existingIds = new Set((user.restaurantIds ?? []).map((id) => id.toString()));
    for (const id of invite.restaurantIds) {
      if (!existingIds.has(id.toString())) {
        user.restaurantIds = [...(user.restaurantIds ?? []), id];
      }
    }
    await user.save();
  }

  invite.userId = user._id;
  invite.acceptedAt = new Date();
  await invite.save();

  const tokens = await issueTokens(user);
  return { ...tokens, user };
}
