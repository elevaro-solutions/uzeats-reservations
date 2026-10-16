import { describe, expect, it } from 'vitest';
import {
  assertCanEditUser,
  canAccessPartnerPath,
  canCreateRestaurant,
  canImportRestaurant,
  canManageBilling,
  canManageQaChecklist,
  canManageTeam,
  isHostRole,
  isPartnerMobileRole,
  isPlatformAdmin,
  isSuperAdmin,
  isVenueStaffRole,
  partnerLandingPath,
} from '../roles.js';

describe('roles', () => {
  it('classifies platform admins', () => {
    expect(isPlatformAdmin('admin')).toBe(true);
    expect(isPlatformAdmin('account_manager')).toBe(true);
    expect(isPlatformAdmin('super_admin')).toBe(true);
    expect(isPlatformAdmin('restaurant_owner')).toBe(false);
    expect(isPlatformAdmin('diner')).toBe(false);
  });

  it('gates partner mobile roles', () => {
    expect(isPartnerMobileRole('host')).toBe(true);
    expect(isPartnerMobileRole('manager')).toBe(true);
    expect(isPartnerMobileRole('restaurant_owner')).toBe(true);
    expect(isPartnerMobileRole('diner')).toBe(false);
    expect(isPartnerMobileRole('admin')).toBe(false);
  });

  it('treats managers and hosts as venue staff', () => {
    expect(isVenueStaffRole('manager')).toBe(true);
    expect(isVenueStaffRole('host')).toBe(true);
    expect(isVenueStaffRole('restaurant_owner')).toBe(false);
  });

  it('restricts billing and team to owners and platform admins', () => {
    expect(canManageBilling('restaurant_owner')).toBe(true);
    expect(canManageBilling('admin')).toBe(true);
    expect(canManageBilling('manager')).toBe(false);
    expect(canManageBilling('host')).toBe(false);
    expect(canManageTeam('restaurant_owner')).toBe(true);
    expect(canManageTeam('host')).toBe(false);
  });

  it('blocks managers/hosts from creating restaurants', () => {
    expect(canCreateRestaurant('diner')).toBe(true);
    expect(canCreateRestaurant('restaurant_owner')).toBe(true);
    expect(canCreateRestaurant('manager')).toBe(false);
    expect(canCreateRestaurant('host')).toBe(false);
    expect(canCreateRestaurant('qa')).toBe(false);
    expect(canManageQaChecklist('qa')).toBe(true);
    expect(canManageQaChecklist('super_admin')).toBe(true);
    expect(canManageQaChecklist('admin')).toBe(false);
  });

  it('allows import for owners, managers, and admins', () => {
    expect(canImportRestaurant('restaurant_owner')).toBe(true);
    expect(canImportRestaurant('manager')).toBe(true);
    expect(canImportRestaurant('admin')).toBe(true);
    expect(canImportRestaurant('host')).toBe(false);
    expect(canImportRestaurant('diner')).toBe(false);
  });

  it('limits host Partner Hub paths to FOH surfaces', () => {
    expect(canAccessPartnerPath('host', '/reservations')).toBe(true);
    expect(canAccessPartnerPath('host', '/reservations/abc')).toBe(true);
    expect(canAccessPartnerPath('host', '/waitlist')).toBe(true);
    expect(canAccessPartnerPath('host', '/floor-ops')).toBe(true);
    expect(canAccessPartnerPath('host', '/billing')).toBe(false);
    expect(canAccessPartnerPath('host', '/overview')).toBe(false);
    expect(canAccessPartnerPath('host', '/settings')).toBe(false);
    expect(canAccessPartnerPath('manager', '/billing')).toBe(true);
  });

  it('picks partner landing paths by role', () => {
    expect(partnerLandingPath('admin')).toBe('/admin');
    expect(partnerLandingPath('qa')).toBe('/admin/qa');
    expect(partnerLandingPath('host')).toBe('/reservations');
    expect(partnerLandingPath('restaurant_owner')).toBe('/overview');
    expect(partnerLandingPath('manager')).toBe('/overview');
  });

  it('only lets super admins edit super admins', () => {
    expect(() => assertCanEditUser('admin', 'super_admin')).toThrow(/super admin/i);
    expect(() => assertCanEditUser('super_admin', 'super_admin')).not.toThrow();
    expect(isSuperAdmin('super_admin')).toBe(true);
    expect(isHostRole('host')).toBe(true);
  });
});
