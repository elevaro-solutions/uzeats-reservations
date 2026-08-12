import type { UserRole } from './types.js';

/** Platform operators with admin dashboard access. */
export const PLATFORM_ADMIN_ROLES = ['admin', 'super_admin'] as const satisfies readonly UserRole[];

/** Roles that only a super admin may assign or delete. */
export const ELEVATED_ADMIN_ROLES = ['admin', 'super_admin'] as const satisfies readonly UserRole[];

export function isPlatformAdmin(role: string): role is UserRole {
  return role === 'admin' || role === 'super_admin';
}

export function isSuperAdmin(role: string): role is UserRole {
  return role === 'super_admin';
}

/** Owners and platform admins may change plans, cancel, or subscribe. Staff is view-only. */
export function canManageBilling(role: string): boolean {
  return role === 'restaurant_owner' || isPlatformAdmin(role);
}

/** Staff cannot add locations; diners may convert to owners via onboarding. */
export function canCreateRestaurant(role: string): boolean {
  return role !== 'staff';
}

/** Whether `actorRole` may modify a user with `targetRole`. */
export function canEditUser(actorRole: string, targetRole: string): boolean {
  if (isSuperAdmin(targetRole) && !isSuperAdmin(actorRole)) return false;
  return true;
}

export function assertCanEditUser(actorRole: string, targetRole: string): void {
  if (!canEditUser(actorRole, targetRole)) {
    throw new Error('Only a super admin can modify super admin accounts');
  }
}

export function isElevatedAdminRole(role: string): role is (typeof ELEVATED_ADMIN_ROLES)[number] {
  return (ELEVATED_ADMIN_ROLES as readonly string[]).includes(role);
}
