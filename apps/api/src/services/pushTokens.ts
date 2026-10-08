import { User } from '../models/User.js';

function requirePushToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) throw new Error('Push token is required');
  return trimmed;
}

/** Remove this device token from every user. Idempotent. */
export async function releasePushToken(token: string): Promise<void> {
  const trimmed = requirePushToken(token);
  await User.updateMany(
    { 'pushTokens.token': trimmed },
    { $pull: { pushTokens: { token: trimmed } } },
  );
}

/** Bind this device token to one user, clearing it from any other account. */
export async function claimPushToken(
  userId: string,
  token: string,
  platform: string,
): Promise<void> {
  const trimmed = requirePushToken(token);
  await releasePushToken(trimmed);
  await User.findByIdAndUpdate(userId, {
    $push: { pushTokens: { token: trimmed, platform } },
  });
}
