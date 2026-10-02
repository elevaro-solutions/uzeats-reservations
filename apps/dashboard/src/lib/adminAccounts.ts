export type AccountKind = 'diner' | 'manager' | 'restaurant_owner' | 'platform';

export type ManagedAccountRole = 'diner' | 'manager' | 'host' | 'restaurant_owner';

export type PlatformAccountRole = 'admin' | 'account_manager' | 'super_admin';

export type RestaurantAccountRole = 'restaurant_owner' | 'manager' | 'host';

export type AccountRecord = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: string;
  loyaltyPoints?: number;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  restaurantIds?: string[];
  createdAt?: string;
};

export type AccountKindMeta = {
  title: string;
  singular: string;
  subtitle: string;
  createLabel: string;
  role?: ManagedAccountRole;
  roles?: string[];
  showRestaurants: boolean;
  showLoyalty: boolean;
  showInvite: boolean;
  requireRestaurantsOnCreate: boolean;
  allowRestaurantsOnCreate: boolean;
  allowCreate: boolean;
  /** Show role column / role filter (multi-role lists). */
  showRoleColumn: boolean;
};

export const ROLE_LABELS: Record<string, string> = {
  diner: 'Guest',
  restaurant_owner: 'Owner',
  manager: 'Manager',
  host: 'Host',
  admin: 'Admin',
  account_manager: 'Account manager',
  super_admin: 'Super Admin',
};

export const PLATFORM_ROLE_OPTIONS: Array<{ value: PlatformAccountRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'account_manager', label: 'Account manager' },
  { value: 'super_admin', label: 'Super Admin' },
];

export const RESTAURANT_ACCOUNT_ROLE_OPTIONS: Array<{
  value: RestaurantAccountRole;
  label: string;
}> = [
  { value: 'restaurant_owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'host', label: 'Host' },
];

/** Roles an admin can pick when creating an admin (super admin is promote-only). */
export const PLATFORM_CREATE_ROLE_OPTIONS = PLATFORM_ROLE_OPTIONS.filter(
  (option) => option.value !== 'super_admin',
);

export type PlatformCapabilityCell = boolean | 'limited';

export type PlatformCapabilityRow = {
  id: string;
  capability: string;
  account_manager: PlatformCapabilityCell;
  admin: PlatformCapabilityCell;
  super_admin: PlatformCapabilityCell;
};

export type RestaurantCapabilityRow = {
  id: string;
  capability: string;
  restaurant_owner: PlatformCapabilityCell;
  manager: PlatformCapabilityCell;
  host: PlatformCapabilityCell;
};

/** Shown on Admins → Roles & capabilities. */
export const PLATFORM_ROLE_CAPABILITIES: PlatformCapabilityRow[] = [
  {
    id: 'admin_dashboard',
    capability: 'Admin dashboard',
    account_manager: true,
    admin: true,
    super_admin: true,
  },
  {
    id: 'restaurants',
    capability: 'View and manage restaurants',
    account_manager: true,
    admin: true,
    super_admin: true,
  },
  {
    id: 'reservations',
    capability: 'View reservations and change date & time',
    account_manager: true,
    admin: true,
    super_admin: true,
  },
  {
    id: 'users',
    capability: 'Manage guests and restaurant accounts',
    account_manager: true,
    admin: true,
    super_admin: true,
  },
  {
    id: 'admins',
    capability: 'Manage admins',
    account_manager: 'limited',
    admin: 'limited',
    super_admin: true,
  },
  {
    id: 'support',
    capability: 'Support tickets and moderation',
    account_manager: true,
    admin: true,
    super_admin: true,
  },
  {
    id: 'billing',
    capability: 'Billing, plans, and exports',
    account_manager: true,
    admin: true,
    super_admin: true,
  },
  {
    id: 'config',
    capability: 'Platform config and content',
    account_manager: true,
    admin: true,
    super_admin: true,
  },
  {
    id: 'delete',
    capability: 'Permanently delete users or restaurants',
    account_manager: false,
    admin: false,
    super_admin: true,
  },
  {
    id: 'assign_elevated',
    capability: 'Assign Admin or Super Admin',
    account_manager: false,
    admin: false,
    super_admin: true,
  },
  {
    id: 'edit_super',
    capability: 'Edit Super Admin accounts',
    account_manager: false,
    admin: false,
    super_admin: true,
  },
];

/** Shown on Restaurant accounts → Roles & capabilities. */
export const RESTAURANT_ROLE_CAPABILITIES: RestaurantCapabilityRow[] = [
  {
    id: 'partner_hub',
    capability: 'Partner Hub for assigned venues',
    restaurant_owner: true,
    manager: true,
    host: true,
  },
  {
    id: 'reservations',
    capability: 'Reservations, waitlist, live floor, deposits',
    restaurant_owner: true,
    manager: true,
    host: true,
  },
  {
    id: 'guests',
    capability: 'Guest CRM and messages',
    restaurant_owner: true,
    manager: true,
    host: true,
  },
  {
    id: 'reviews',
    capability: 'Reviews and grow / marketing',
    restaurant_owner: true,
    manager: true,
    host: false,
  },
  {
    id: 'settings',
    capability: 'Venue settings, menu, floor plan',
    restaurant_owner: true,
    manager: true,
    host: false,
  },
  {
    id: 'support',
    capability: 'Open and reply to support tickets',
    restaurant_owner: true,
    manager: true,
    host: true,
  },
  {
    id: 'import',
    capability: 'Import restaurant / menu data',
    restaurant_owner: true,
    manager: true,
    host: false,
  },
  {
    id: 'billing',
    capability: 'Billing, plans, and payment methods',
    restaurant_owner: true,
    manager: false,
    host: false,
  },
  {
    id: 'add_location',
    capability: 'Add restaurant locations',
    restaurant_owner: true,
    manager: false,
    host: false,
  },
  {
    id: 'team',
    capability: 'Invite and manage venue team',
    restaurant_owner: true,
    manager: false,
    host: false,
  },
];

export const ACCOUNT_KIND_META: Record<AccountKind, AccountKindMeta> = {
  diner: {
    title: 'Guests',
    singular: 'Guest',
    subtitle: 'Customer accounts on the guest app — bookings, loyalty, and profile.',
    createLabel: 'Create guest',
    role: 'diner',
    showRestaurants: false,
    showLoyalty: true,
    showInvite: false,
    requireRestaurantsOnCreate: false,
    allowRestaurantsOnCreate: false,
    allowCreate: true,
    showRoleColumn: false,
  },
  manager: {
    title: 'Managers',
    singular: 'Manager',
    subtitle: 'Venue managers with Partner Hub access for assigned restaurants.',
    createLabel: 'Create manager',
    role: 'manager',
    showRestaurants: true,
    showLoyalty: false,
    showInvite: true,
    requireRestaurantsOnCreate: true,
    allowRestaurantsOnCreate: true,
    allowCreate: true,
    showRoleColumn: false,
  },
  restaurant_owner: {
    title: 'Restaurant accounts',
    singular: 'Restaurant account',
    subtitle: 'Owners, managers, and hosts with Partner Hub access to venues.',
    createLabel: 'Create account',
    roles: ['restaurant_owner', 'manager', 'host'],
    showRestaurants: true,
    showLoyalty: false,
    showInvite: true,
    requireRestaurantsOnCreate: false,
    allowRestaurantsOnCreate: true,
    allowCreate: true,
    showRoleColumn: true,
  },
  platform: {
    title: 'Admins',
    singular: 'Admin',
    subtitle: 'Platform operators with admin dashboard access.',
    createLabel: 'Create admin',
    roles: ['admin', 'account_manager', 'super_admin'],
    showRestaurants: false,
    showLoyalty: false,
    showInvite: false,
    requireRestaurantsOnCreate: false,
    allowRestaurantsOnCreate: false,
    allowCreate: true,
    showRoleColumn: true,
  },
};

export function accountKindForRole(role: string): AccountKind {
  if (role === 'diner') return 'diner';
  if (role === 'restaurant_owner' || role === 'manager' || role === 'host') {
    return 'restaurant_owner';
  }
  return 'platform';
}

export function accountListPath(kind: AccountKind): string {
  switch (kind) {
    case 'diner':
      return '/admin/diners';
    case 'manager':
    case 'restaurant_owner':
      return '/admin/owners';
    default:
      return '/admin/users';
  }
}

export function accountDetailPath(role: string, id: string): string {
  return `${accountListPath(accountKindForRole(role))}/${id}`;
}

export const PASSWORD_FORM_RULES = [
  { required: true, message: 'Please enter a password' },
  { min: 8, message: 'Password must be at least 8 characters' },
  { pattern: /[a-z]/, message: 'Password must include a lowercase letter' },
  { pattern: /[A-Z]/, message: 'Password must include an uppercase letter' },
  { pattern: /\d/, message: 'Password must include a number' },
];
