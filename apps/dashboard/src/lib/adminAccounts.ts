export type AccountKind = 'diner' | 'staff' | 'restaurant_owner' | 'platform';

export type ManagedAccountRole = 'diner' | 'staff' | 'restaurant_owner';

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
  roles?: Array<'admin' | 'super_admin'>;
  showRestaurants: boolean;
  showLoyalty: boolean;
  showInvite: boolean;
  requireRestaurantsOnCreate: boolean;
  allowRestaurantsOnCreate: boolean;
  allowCreate: boolean;
};

export const ACCOUNT_KIND_META: Record<AccountKind, AccountKindMeta> = {
  diner: {
    title: 'Diners',
    singular: 'Diner',
    subtitle: 'Customer accounts on the diner app — bookings, loyalty, and profile.',
    createLabel: 'Create diner',
    role: 'diner',
    showRestaurants: false,
    showLoyalty: true,
    showInvite: false,
    requireRestaurantsOnCreate: false,
    allowRestaurantsOnCreate: false,
    allowCreate: true,
  },
  staff: {
    title: 'Staff',
    singular: 'Staff member',
    subtitle: 'Restaurant team accounts with venue access on the partner dashboard.',
    createLabel: 'Create staff',
    role: 'staff',
    showRestaurants: true,
    showLoyalty: false,
    showInvite: true,
    requireRestaurantsOnCreate: true,
    allowRestaurantsOnCreate: true,
    allowCreate: true,
  },
  restaurant_owner: {
    title: 'Restaurant owners',
    singular: 'Restaurant owner',
    subtitle: 'Partner accounts that own or operate venues.',
    createLabel: 'Create owner',
    role: 'restaurant_owner',
    showRestaurants: true,
    showLoyalty: false,
    showInvite: true,
    requireRestaurantsOnCreate: false,
    allowRestaurantsOnCreate: true,
    allowCreate: true,
  },
  platform: {
    title: 'Platform users',
    singular: 'Platform user',
    subtitle: 'Admin and super admin access to this dashboard.',
    createLabel: 'Create',
    roles: ['admin', 'super_admin'],
    showRestaurants: false,
    showLoyalty: false,
    showInvite: false,
    requireRestaurantsOnCreate: false,
    allowRestaurantsOnCreate: false,
    allowCreate: false,
  },
};

export function accountKindForRole(role: string): AccountKind {
  if (role === 'diner') return 'diner';
  if (role === 'staff') return 'staff';
  if (role === 'restaurant_owner') return 'restaurant_owner';
  return 'platform';
}

export function accountListPath(kind: AccountKind): string {
  switch (kind) {
    case 'diner':
      return '/admin/diners';
    case 'staff':
      return '/admin/staff';
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
