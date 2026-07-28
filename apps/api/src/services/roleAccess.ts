import { isElevatedAdminRole, type UserRole } from '@reservations/shared';
import { User } from '../models/User.js';

export async function hasSuperAdminAccount(): Promise<boolean> {
  const count = await User.countDocuments({ role: 'super_admin' });
  return count > 0;
}

/** Enforces who may assign `admin` or `super_admin` roles. */
export async function assertCanAssignRole(actorRole: UserRole, newRole: string): Promise<void> {
  if (!isElevatedAdminRole(newRole)) return;
  if (actorRole === 'super_admin') return;
  if (newRole === 'super_admin' && !(await hasSuperAdminAccount())) {
    return;
  }
  throw new Error('Only a super admin can assign admin or super admin roles');
}
