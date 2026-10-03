import type { UserRole } from './types.js';

/** Platform operators with admin dashboard access. */
export const PLATFORM_ADMIN_ROLES = [
  'admin',
  'account_manager',
  'super_admin',
] as const satisfies readonly UserRole[];

/** Roles that only a super admin may assign or delete. */
export const ELEVATED_ADMIN_ROLES = ['admin', 'super_admin'] as const satisfies readonly UserRole[];

/**
 * Roles allowed to use Tablevera Merchant Mobile (restaurant partners).
 * Diners and platform admins are rejected by the merchant app client.
 */
export const PARTNER_MOBILE_ROLES = [
  'restaurant_owner',
  'manager',
  'host',
] as const satisfies readonly UserRole[];

/**
 * Venue staff assigned via `restaurantIds` (not the primary owner).
 * Both consume package manager/team seats.
 */
export const VENUE_STAFF_ROLES = ['manager', 'host'] as const satisfies readonly UserRole[];

/**
 * Partner Hub roles that land in the restaurant dashboard (not the diner app).
 * Platform admins are included when impersonating or using partner chrome.
 */
export const PARTNER_HUB_ROLES = [
  'restaurant_owner',
  'manager',
  'host',
  'admin',
  'account_manager',
  'super_admin',
] as const satisfies readonly UserRole[];

/**
 * Host (FOH) Partner Hub routes — day-of operations only.
 * Industry-standard host surfaces: book of the day, waitlist, live floor,
 * guest lookup, booking messages, deposits (via reservation detail), support.
 */
export const HOST_ALLOWED_PATH_PREFIXES = [
  '/reservations',
  '/waitlist',
  '/floor-ops',
  '/guests',
  '/messages',
  '/support',
  '/notifications',
] as const;

export function isPlatformAdmin(role: string): role is UserRole {
  return (
    role === 'admin' || role === 'account_manager' || role === 'super_admin'
  );
}

export function isPartnerMobileRole(
  role: string,
): role is (typeof PARTNER_MOBILE_ROLES)[number] {
  return (PARTNER_MOBILE_ROLES as readonly string[]).includes(role);
}

export function isPartnerHubRole(
  role: string,
): role is (typeof PARTNER_HUB_ROLES)[number] {
  return (PARTNER_HUB_ROLES as readonly string[]).includes(role);
}

export function isVenueStaffRole(
  role: string,
): role is (typeof VENUE_STAFF_ROLES)[number] {
  return (VENUE_STAFF_ROLES as readonly string[]).includes(role);
}

export function isHostRole(role: string): boolean {
  return role === 'host';
}

export function isSuperAdmin(role: string): role is UserRole {
  return role === 'super_admin';
}

/** Owners and platform admins may change plans, cancel, or subscribe. Managers/hosts are view-only / blocked. */
export function canManageBilling(role: string): boolean {
  return role === 'restaurant_owner' || isPlatformAdmin(role);
}

/** Owners and platform admins may invite/remove venue managers and hosts. Staff cannot. */
export function canManageTeam(role: string): boolean {
  return role === 'restaurant_owner' || isPlatformAdmin(role);
}

/** Managers and hosts cannot add locations; diners may convert to owners via onboarding. */
export function canCreateRestaurant(role: string): boolean {
  return role !== 'manager' && role !== 'host';
}

/** DoorDash/Uber Eats MHTML import and menu-image fetch (dashboard, not diners/hosts). */
export function canImportRestaurant(role: string): boolean {
  return role === 'restaurant_owner' || role === 'manager' || isPlatformAdmin(role);
}

/** Whether a Partner Hub pathname is allowed for this role. Hosts are FOH-only. */
export function canAccessPartnerPath(role: string, pathname: string): boolean {
  if (!isHostRole(role)) return true;
  if (pathname === '/' || pathname === '' || pathname === '/overview') return false;
  return HOST_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Default Partner Hub landing after login. Hosts go straight to today's book. */
export function partnerLandingPath(role: string): string {
  if (isPlatformAdmin(role)) return '/admin';
  if (isHostRole(role)) return '/reservations';
  return '/overview';
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
