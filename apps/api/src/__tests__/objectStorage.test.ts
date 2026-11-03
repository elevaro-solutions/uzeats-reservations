import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { env } from '../config/env.js';
import { uploadKeyPrefix } from '@reservations/shared';
import {
  buildScopedObjectKey,
  isOwnUploadUrl,
  isScopedUploadPrefix,
  resolveLocalUploadPath,
} from '../services/spaces.js';

const RESTAURANT_ID = '507f1f77bcf86cd799439011';

describe('scoped object keys', () => {
  const prefix = uploadKeyPrefix({
    scope: 'restaurant',
    restaurantId: RESTAURANT_ID,
    kind: 'menu',
  });

  it('writes restaurant, account, and platform folders', () => {
    expect(prefix).toBe(`restaurants/${RESTAURANT_ID}/menu/`);
    expect(isScopedUploadPrefix(prefix)).toBe(true);
    expect(isScopedUploadPrefix('uploads/')).toBe(false);
    expect(isScopedUploadPrefix('restaurants/../menu/')).toBe(false);

    const key = buildScopedObjectKey(prefix, 'Soup Photo.JPG', 'image/jpeg');
    expect(key.startsWith(prefix)).toBe(true);
    expect(key.endsWith('-Soup_Photo.jpg')).toBe(true);
  });

  it('recognizes new keys and legacy uploads', () => {
    const key = buildScopedObjectKey(prefix, 'dish.png', 'image/png');
    expect(isOwnUploadUrl(`https://cdn.example.com/${key}`)).toBe(false);
    expect(
      isOwnUploadUrl(`https://${env.DO_SPACES_BUCKET}.nyc3.digitaloceanspaces.com/${key}`),
    ).toBe(true);
    expect(
      isOwnUploadUrl(
        `https://${env.DO_SPACES_BUCKET}.nyc3.digitaloceanspaces.com/uploads/old-photo.jpg`,
      ),
    ).toBe(true);
    expect(
      isOwnUploadUrl(`https://${env.DO_SPACES_BUCKET}.nyc3.digitaloceanspaces.com/other/file.jpg`),
    ).toBe(false);
    expect(isOwnUploadUrl(`http://localhost:4000/api/uploads/local/${key}`)).toBe(true);
    expect(isOwnUploadUrl('http://localhost:4000/api/uploads/local/legacy-photo.jpg')).toBe(true);
  });

  it('keeps local files inside the upload directory', () => {
    const key = buildScopedObjectKey(prefix, 'dish.png', 'image/png');
    const filePath = resolveLocalUploadPath(key);
    expect(filePath.includes(`${path.sep}restaurants${path.sep}`)).toBe(true);
    expect(() => resolveLocalUploadPath('../etc/passwd')).toThrow(/Invalid upload path/);
    expect(() => resolveLocalUploadPath(['restaurants', '..', 'secret'])).toThrow(
      /Invalid upload path/,
    );
  });
});
