import type { Request, Response } from 'express';
import { parseCookie, stringifySetCookie } from 'cookie';
import { env } from '../config/env.js';

export type BrowserAuthApp = 'web' | 'dashboard';

const ACCESS_MAX_AGE_SEC = 15 * 60;
const REFRESH_MAX_AGE_SEC = 7 * 24 * 60 * 60;
const IMPERSONATION_MAX_AGE_SEC = 60 * 60;

function cookieNames(app: BrowserAuthApp) {
  const prefix = app === 'dashboard' ? 'tv_dash' : 'tv_web';
  return {
    access: `${prefix}_access`,
    refresh: `${prefix}_refresh`,
    adminAccess: `${prefix}_admin_access`,
    adminRefresh: `${prefix}_admin_refresh`,
  };
}

function serializeAuthCookie(name: string, value: string, maxAgeSec: number) {
  const secure = env.NODE_ENV === 'production';
  return stringifySetCookie({
    name,
    value,
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  });
}

export function resolveBrowserAuthApp(req: Request): BrowserAuthApp | null {
  const header = req.headers['x-client-app'];
  const value = Array.isArray(header) ? header[0] : header;
  if (value === 'web' || value === 'dashboard') return value;
  return null;
}

export function readCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const parsed = parseCookie(header);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

function appendCookie(res: Response, name: string, value: string, maxAgeSec: number) {
  const serialized = serializeAuthCookie(name, value, maxAgeSec);
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', serialized);
    return;
  }
  const list = Array.isArray(existing) ? existing : [String(existing)];
  res.setHeader('Set-Cookie', [...list, serialized]);
}

function clearCookie(res: Response, name: string) {
  const serialized = serializeAuthCookie(name, '', 0);
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', serialized);
    return;
  }
  const list = Array.isArray(existing) ? existing : [String(existing)];
  res.setHeader('Set-Cookie', [...list, serialized]);
}

export function getAccessTokenFromRequest(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ') && header.length > 7) {
    return header.slice(7);
  }

  const app = resolveBrowserAuthApp(req);
  const cookies = readCookies(req);
  if (app) {
    return cookies[cookieNames(app).access] || null;
  }
  return cookies[cookieNames('web').access] || cookies[cookieNames('dashboard').access] || null;
}

export function getRefreshTokenFromRequest(req: Request, explicit?: string | null): string | null {
  if (explicit) return explicit;
  const app = resolveBrowserAuthApp(req);
  if (!app) return null;
  const cookies = readCookies(req);
  return cookies[cookieNames(app).refresh] || null;
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  app: BrowserAuthApp,
) {
  const names = cookieNames(app);
  appendCookie(res, names.access, tokens.accessToken, ACCESS_MAX_AGE_SEC);
  if (tokens.refreshToken) {
    appendCookie(res, names.refresh, tokens.refreshToken, REFRESH_MAX_AGE_SEC);
  }
}

export function clearAuthCookies(res: Response, app: BrowserAuthApp) {
  const names = cookieNames(app);
  clearCookie(res, names.access);
  clearCookie(res, names.refresh);
  clearCookie(res, names.adminAccess);
  clearCookie(res, names.adminRefresh);
}

/** Swap dashboard session into an impersonation access cookie; backup admin tokens. */
export function beginImpersonationCookies(res: Response, req: Request, accessToken: string) {
  const names = cookieNames('dashboard');
  const cookies = readCookies(req);
  const currentAccess = cookies[names.access];
  const currentRefresh = cookies[names.refresh];
  if (currentAccess) {
    appendCookie(res, names.adminAccess, currentAccess, REFRESH_MAX_AGE_SEC);
  }
  if (currentRefresh) {
    appendCookie(res, names.adminRefresh, currentRefresh, REFRESH_MAX_AGE_SEC);
  }
  appendCookie(res, names.access, accessToken, IMPERSONATION_MAX_AGE_SEC);
  clearCookie(res, names.refresh);
}

/** Restore admin cookies after exiting impersonation. Returns whether restore succeeded. */
export function endImpersonationCookies(res: Response, req: Request): boolean {
  const names = cookieNames('dashboard');
  const cookies = readCookies(req);
  const adminAccess = cookies[names.adminAccess];
  if (!adminAccess) {
    clearAuthCookies(res, 'dashboard');
    return false;
  }
  appendCookie(res, names.access, adminAccess, ACCESS_MAX_AGE_SEC);
  const adminRefresh = cookies[names.adminRefresh];
  if (adminRefresh) {
    appendCookie(res, names.refresh, adminRefresh, REFRESH_MAX_AGE_SEC);
  } else {
    clearCookie(res, names.refresh);
  }
  clearCookie(res, names.adminAccess);
  clearCookie(res, names.adminRefresh);
  return true;
}

/** Browser clients get empty tokens in GraphQL body so XSS cannot read them. */
export function authPayloadTokens(
  req: Request,
  tokens: { accessToken: string; refreshToken: string },
) {
  if (resolveBrowserAuthApp(req)) {
    return { accessToken: '', refreshToken: '' };
  }
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
}
