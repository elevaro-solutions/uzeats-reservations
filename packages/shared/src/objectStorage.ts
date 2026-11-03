/**
 * DigitalOcean Spaces key layout. The API builds the prefix; clients only name
 * the scope and folder. Account ids always come from the session.
 *
 *   restaurants/{restaurantId}/branding|menu|floor|experiences|packages|virtual-room|reviews|imports|other/
 *   accounts/{userId}/avatar|support|drafts/
 *   platform/blog|discovery|table-shapes|imports|support/
 *
 * Legacy objects stay under `uploads/` and remain readable.
 */

export const RESTAURANT_UPLOAD_KINDS = [
  'branding',
  'menu',
  'floor',
  'experiences',
  'packages',
  'virtual-room',
  'reviews',
  'imports',
  'other',
] as const;

export const ACCOUNT_UPLOAD_KINDS = ['avatar', 'support', 'drafts'] as const;

export const PLATFORM_UPLOAD_KINDS = [
  'blog',
  'discovery',
  'table-shapes',
  'imports',
  'support',
] as const;

export type RestaurantUploadKind = (typeof RESTAURANT_UPLOAD_KINDS)[number];
export type AccountUploadKind = (typeof ACCOUNT_UPLOAD_KINDS)[number];
export type PlatformUploadKind = (typeof PLATFORM_UPLOAD_KINDS)[number];
export type UploadScope = 'restaurant' | 'account' | 'platform';

export type UploadTarget =
  | { scope: 'restaurant'; restaurantId: string; kind: RestaurantUploadKind }
  | { scope: 'account'; kind: AccountUploadKind }
  | { scope: 'platform'; kind: PlatformUploadKind };

export const UPLOAD_SCOPE_HEADER = 'X-Upload-Scope';
export const UPLOAD_KIND_HEADER = 'X-Upload-Kind';
export const UPLOAD_RESTAURANT_HEADER = 'X-Upload-Restaurant-Id';

const OBJECT_ID = /^[a-f0-9]{24}$/;

const restaurantKinds = new Set<string>(RESTAURANT_UPLOAD_KINDS);
const accountKinds = new Set<string>(ACCOUNT_UPLOAD_KINDS);
const platformKinds = new Set<string>(PLATFORM_UPLOAD_KINDS);

export const accountUpload = {
  avatar: { scope: 'account', kind: 'avatar' },
  support: { scope: 'account', kind: 'support' },
  drafts: { scope: 'account', kind: 'drafts' },
} as const satisfies Record<AccountUploadKind, UploadTarget>;

export const platformUpload = {
  blog: { scope: 'platform', kind: 'blog' },
  discovery: { scope: 'platform', kind: 'discovery' },
  'table-shapes': { scope: 'platform', kind: 'table-shapes' },
  imports: { scope: 'platform', kind: 'imports' },
  support: { scope: 'platform', kind: 'support' },
} as const satisfies Record<PlatformUploadKind, UploadTarget>;

export function restaurantUpload(
  restaurantId: string,
  kind: RestaurantUploadKind,
): UploadTarget {
  return { scope: 'restaurant', restaurantId, kind };
}

export function uploadTargetHeaders(target: UploadTarget): Record<string, string> {
  const headers: Record<string, string> = {
    [UPLOAD_SCOPE_HEADER]: target.scope,
    [UPLOAD_KIND_HEADER]: target.kind,
  };
  if (target.scope === 'restaurant') {
    headers[UPLOAD_RESTAURANT_HEADER] = target.restaurantId;
  }
  return headers;
}

export function parseUploadTarget(input: {
  scope?: string | null;
  kind?: string | null;
  restaurantId?: string | null;
}): UploadTarget {
  const scope = input.scope?.trim().toLowerCase() ?? '';
  const kind = input.kind?.trim().toLowerCase() ?? '';
  if (scope === 'account') {
    if (!accountKinds.has(kind)) {
      throw new Error('Unknown account folder');
    }
    return { scope: 'account', kind: kind as AccountUploadKind };
  }
  if (scope === 'platform') {
    if (!platformKinds.has(kind)) {
      throw new Error('Unknown platform folder');
    }
    return { scope: 'platform', kind: kind as PlatformUploadKind };
  }
  if (scope === 'restaurant') {
    if (!restaurantKinds.has(kind)) {
      throw new Error('Unknown restaurant folder');
    }
    const restaurantId = input.restaurantId?.trim().toLowerCase() ?? '';
    if (!OBJECT_ID.test(restaurantId)) {
      throw new Error('A restaurant id is required for restaurant uploads');
    }
    return { scope: 'restaurant', restaurantId, kind: kind as RestaurantUploadKind };
  }
  throw new Error('Upload folder is required');
}

/** Prefix including the trailing slash. Account ids are the signed-in user, never the client. */
export function uploadKeyPrefix(target: UploadTarget, accountUserId?: string): string {
  if (target.scope === 'restaurant') {
    return `restaurants/${target.restaurantId}/${target.kind}/`;
  }
  if (target.scope === 'platform') {
    return `platform/${target.kind}/`;
  }
  const userId = accountUserId?.trim().toLowerCase() ?? '';
  if (!OBJECT_ID.test(userId)) {
    throw new Error('Invalid account');
  }
  return `accounts/${userId}/${target.kind}/`;
}
