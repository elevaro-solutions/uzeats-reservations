import { User } from '../models/User.js';
import { PlatformConfig } from '../models/PlatformConfig.js';
import { ManagerInvite } from '../models/ManagerInvite.js';
import { logger } from '../lib/logger.js';

/**
 * One-shot data migration: restaurant role `staff` → `manager`, and
 * PlatformConfig.defaultStaffRole → defaultManagerRole.
 * Safe to re-run (no-ops when already migrated).
 */
export async function migrateStaffRoleToManager(): Promise<void> {
  const [users, invites, configs] = await Promise.all([
    User.updateMany({ role: 'staff' }, { $set: { role: 'manager' } }),
    ManagerInvite.updateMany({ role: 'staff' }, { $set: { role: 'manager' } }),
    PlatformConfig.updateMany(
      { defaultStaffRole: { $exists: true } },
      [
        {
          $set: {
            defaultManagerRole: {
              $cond: [
                { $eq: ['$defaultStaffRole', 'staff'] },
                'manager',
                '$defaultStaffRole',
              ],
            },
          },
        },
        { $unset: 'defaultStaffRole' },
      ],
    ),
  ]);

  const changed =
    (users.modifiedCount ?? 0) +
    (invites.modifiedCount ?? 0) +
    (configs.modifiedCount ?? 0);
  if (changed > 0) {
    logger.info(
      {
        users: users.modifiedCount,
        invites: invites.modifiedCount,
        configs: configs.modifiedCount,
      },
      'Migrated staff role → manager',
    );
  }
}
