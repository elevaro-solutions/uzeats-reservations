import crypto from 'node:crypto';
import { User } from '../models/User.js';

function referralPrefix(firstName: string): string {
  const letters = firstName.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return (letters.slice(0, 4) || 'DINE').padEnd(4, 'X');
}

export async function generateUniqueReferralCode(firstName: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = `${referralPrefix(firstName)}${suffix}`;
    const existing = await User.findOne({ referralCode: code }).select('_id');
    if (!existing) return code;
  }
  return `${referralPrefix(firstName)}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function ensureUserReferralCode(user: {
  _id: { toString(): string };
  firstName: string;
  referralCode?: string | null;
}): Promise<string> {
  if (user.referralCode) return user.referralCode;
  const code = await generateUniqueReferralCode(user.firstName);
  await User.findByIdAndUpdate(user._id, { referralCode: code });
  return code;
}
