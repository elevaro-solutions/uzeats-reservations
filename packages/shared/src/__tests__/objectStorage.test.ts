import { describe, expect, it } from 'vitest';
import {
  parseUploadTarget,
  uploadKeyPrefix,
  uploadTargetHeaders,
} from '../objectStorage.js';

const RESTAURANT_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f191e810c19729de860ea';

describe('parseUploadTarget', () => {
  it('accepts restaurant, account, and platform folders', () => {
    expect(
      parseUploadTarget({ scope: 'restaurant', kind: 'menu', restaurantId: RESTAURANT_ID }),
    ).toEqual({ scope: 'restaurant', restaurantId: RESTAURANT_ID, kind: 'menu' });
    expect(parseUploadTarget({ scope: 'account', kind: 'avatar' })).toEqual({
      scope: 'account',
      kind: 'avatar',
    });
    expect(parseUploadTarget({ scope: 'platform', kind: 'blog' })).toEqual({
      scope: 'platform',
      kind: 'blog',
    });
  });

  it('rejects unknown folders and a missing restaurant id', () => {
    expect(() => parseUploadTarget({ scope: 'restaurant', kind: 'secrets' })).toThrow(
      /restaurant folder/i,
    );
    expect(() =>
      parseUploadTarget({ scope: 'restaurant', kind: 'menu', restaurantId: 'not-an-id' }),
    ).toThrow(/restaurant id/i);
    expect(() => parseUploadTarget({ scope: 'account', kind: 'menu' })).toThrow(/account folder/i);
    expect(() => parseUploadTarget({ scope: 'nope', kind: 'blog' })).toThrow(/required/i);
  });
});

describe('uploadKeyPrefix', () => {
  it('builds the folder path and ignores a client user id for restaurants', () => {
    expect(
      uploadKeyPrefix({ scope: 'restaurant', restaurantId: RESTAURANT_ID, kind: 'branding' }),
    ).toBe(`restaurants/${RESTAURANT_ID}/branding/`);
    expect(uploadKeyPrefix({ scope: 'account', kind: 'avatar' }, USER_ID)).toBe(
      `accounts/${USER_ID}/avatar/`,
    );
    expect(uploadKeyPrefix({ scope: 'platform', kind: 'discovery' })).toBe('platform/discovery/');
  });

  it('refuses an account prefix without a user id', () => {
    expect(() => uploadKeyPrefix({ scope: 'account', kind: 'support' })).toThrow(/account/i);
  });
});

describe('uploadTargetHeaders', () => {
  it('sends the restaurant id only for restaurant uploads', () => {
    expect(
      uploadTargetHeaders({ scope: 'restaurant', restaurantId: RESTAURANT_ID, kind: 'floor' }),
    ).toMatchObject({
      'X-Upload-Scope': 'restaurant',
      'X-Upload-Kind': 'floor',
      'X-Upload-Restaurant-Id': RESTAURANT_ID,
    });
    expect(uploadTargetHeaders({ scope: 'account', kind: 'avatar' })).not.toHaveProperty(
      'X-Upload-Restaurant-Id',
    );
  });
});
