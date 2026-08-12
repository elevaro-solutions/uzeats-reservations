import { isElevatedAdminRole, type UserRole } from '@reservations/shared';
import { User } from '../models/User.js';

export async function hasSuperAdminAccount(): Promise<boolean> {
  const count = await User.countDocuments({ role: 'super_admin' });
  return count > 0;
}

/** Roles that public/partner registration may assign (never platform admin). */
export const SAFE_REGISTRATION_ROLES = [
  'diner',
  'restaurant_owner',
  'staff',
] as const satisfies readonly UserRole[];

export function clampRegistrationRole(
  role: string | undefined,
  fallback: (typeof SAFE_REGISTRATION_ROLES)[number],
): (typeof SAFE_REGISTRATION_ROLES)[number] {
  if (role && (SAFE_REGISTRATION_ROLES as readonly string[]).includes(role)) {
    return role as (typeof SAFE_REGISTRATION_ROLES)[number];
  }
  return fallback;
}

/** Enforces who may assign `admin` or `super_admin` roles. No bootstrap bypass. */
export async function assertCanAssignRole(actorRole: UserRole, newRole: string): Promise<void> {
  if (!isElevatedAdminRole(newRole)) return;
  if (actorRole === 'super_admin') return;
  throw new Error('Only a super admin can assign admin or super admin roles');
}
