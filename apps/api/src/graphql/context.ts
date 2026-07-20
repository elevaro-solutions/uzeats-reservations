import type { Request } from 'express';
import type { UserRole } from '@reservations/shared';
import { User } from '../models/User.js';
import { verifyAccessToken } from '../services/auth.js';
import type { UserDocument } from '../models/User.js';

export interface GraphQLContext {
  user: UserDocument | null;
  impersonator: UserDocument | null;
  req: Request;
}

export async function createContext({ req }: { req: Request }): Promise<GraphQLContext> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return { user: null, impersonator: null, req };
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    const user = await User.findById(payload.sub);
    let impersonator: UserDocument | null = null;
    if (payload.impersonatorId) {
      impersonator = await User.findById(payload.impersonatorId);
      if (!impersonator || impersonator.role !== 'admin') {
        return { user: null, impersonator: null, req };
      }
    }
    return { user, impersonator, req };
  } catch {
    return { user: null, impersonator: null, req };
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

/** Admin actions must be performed as the real admin, not while impersonating. */
export function requireAdmin(ctx: GraphQLContext) {
  if (ctx.impersonator) {
    throw new Error('Exit impersonation before performing admin actions');
  }
  return requireRole(ctx, ['admin']);
}
