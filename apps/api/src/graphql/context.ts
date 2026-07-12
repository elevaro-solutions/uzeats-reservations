import type { Request } from 'express';
import type { UserRole } from '@reservations/shared';
import { User } from '../models/User.js';
import { verifyAccessToken } from '../services/auth.js';
import type { UserDocument } from '../models/User.js';

export interface GraphQLContext {
  user: UserDocument | null;
  req: Request;
}

export async function createContext({ req }: { req: Request }): Promise<GraphQLContext> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return { user: null, req };
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    const user = await User.findById(payload.sub);
    return { user, req };
  } catch {
    return { user: null, req };
  }
}

export function requireAuth(ctx: GraphQLContext) {
  if (!ctx.user) throw new Error('Authentication required');
  return ctx.user;
}

export function requireRole(ctx: GraphQLContext, roles: UserRole[]) {
  const user = requireAuth(ctx);
  if (!roles.includes(user.role)) throw new Error('Forbidden');
  return user;
}
