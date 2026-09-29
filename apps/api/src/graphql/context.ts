import type { Request, Response } from 'express';
import { isPlatformAdmin, PLATFORM_ADMIN_ROLES, type UserRole } from '@reservations/shared';
import { User } from '../models/User.js';
import { verifyAccessToken } from '../services/auth.js';
import { getAccessTokenFromRequest } from '../services/authCookies.js';
import type { UserDocument } from '../models/User.js';
import { AuthenticationError, ForbiddenError } from '../lib/errors.js';
import { createLoaders, type GraphQLLoaders } from './loaders.js';
import { normalizeVisitorKey, VISITOR_KEY_HEADER } from '../services/reviewReactions.js';

export interface GraphQLContext {
  user: UserDocument | null;
  impersonator: UserDocument | null;
  visitorKey: string | null;
  req: Request;
  res: Response;
  loaders: GraphQLLoaders;
}

function visitorKeyFromRequest(req: Request): string | null {
  const raw = req.headers[VISITOR_KEY_HEADER];
  return normalizeVisitorKey(Array.isArray(raw) ? raw[0] : raw);
}

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<GraphQLContext> {
  const visitorKey = visitorKeyFromRequest(req);
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    return {
      user: null,
      impersonator: null,
      visitorKey,
      req,
      res,
      loaders: createLoaders({ userId: null, visitorKey }),
    };
  }
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    let impersonator: UserDocument | null = null;
    if (payload.impersonatorId) {
      impersonator = await User.findById(payload.impersonatorId);
      if (!impersonator || !isPlatformAdmin(impersonator.role)) {
        return {
          user: null,
          impersonator: null,
          visitorKey,
          req,
          res,
          loaders: createLoaders({ userId: null, visitorKey }),
        };
      }
    }
    return {
      user,
      impersonator,
      visitorKey,
      req,
      res,
      loaders: createLoaders({
        userId: user?._id.toString() ?? null,
        visitorKey: user ? null : visitorKey,
      }),
    };
  } catch {
    return {
      user: null,
      impersonator: null,
      visitorKey,
      req,
      res,
      loaders: createLoaders({ userId: null, visitorKey }),
    };
  }
}

export function requireAuth(ctx: GraphQLContext) {
  if (!ctx.user) throw new AuthenticationError();
  return ctx.user;
}

export function requireRole(ctx: GraphQLContext, roles: UserRole[]) {
  const user = requireAuth(ctx);
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

/** Platform admin actions must be performed as the real admin, not while impersonating. */
export function requireAdmin(ctx: GraphQLContext) {
  if (ctx.impersonator) {
    throw new ForbiddenError('Exit impersonation before performing admin actions');
  }
  return requireRole(ctx, [...PLATFORM_ADMIN_ROLES]);
}

/** Destructive platform actions (permanent deletes, seed wipe, restaurant removal). */
export function requireSuperAdmin(ctx: GraphQLContext) {
  if (ctx.impersonator) {
    throw new ForbiddenError('Exit impersonation before performing super admin actions');
  }
  return requireRole(ctx, ['super_admin']);
}
