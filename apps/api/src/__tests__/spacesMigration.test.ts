import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import {
  chooseMigrationPrefix,
  legacyUploadsFilename,
  migratedObjectKey,
  rewriteStoredValue,
} from '../services/spacesMigration.js';

const RESTAURANT = '507f1f77bcf86cd799439011';

describe('legacy upload keys', () => {
  it('keeps a flat uploads filename and rejects scoped keys', () => {
    expect(legacyUploadsFilename('uploads/123-dish.jpg')).toBe('123-dish.jpg');
    expect(legacyUploadsFilename(`restaurants/${RESTAURANT}/menu/123-dish.jpg`)).toBeNull();
    expect(legacyUploadsFilename('uploads/../secret.jpg')).toBeNull();
    expect(migratedObjectKey(`restaurants/${RESTAURANT}/menu/`, 'uploads/123-dish.jpg')).toBe(
      `restaurants/${RESTAURANT}/menu/123-dish.jpg`,
    );
  });

  it('sends a shared object to platform imports when folders disagree', () => {
    expect(chooseMigrationPrefix([`restaurants/${RESTAURANT}/menu/`])).toBe(
      `restaurants/${RESTAURANT}/menu/`,
    );
    expect(
      chooseMigrationPrefix([
        `restaurants/${RESTAURANT}/menu/`,
        `restaurants/${RESTAURANT}/branding/`,
      ]),
    ).toBe('platform/imports/');
  });
});

describe('rewriteStoredValue', () => {
  const urlMap = new Map([
    [
      'https://cdn.example.com/uploads/123-dish.jpg',
      `https://cdn.example.com/restaurants/${RESTAURANT}/menu/123-dish.jpg`,
    ],
  ]);
  const keyMap = new Map([
    ['uploads/123-dish.jpg', `restaurants/${RESTAURANT}/menu/123-dish.jpg`],
  ]);

  it('rewrites urls, attachment keys, and html without touching object ids', () => {
    const id = new Types.ObjectId();
    const rewritten = rewriteStoredValue(
      {
        _id: id,
        photos: ['https://cdn.example.com/uploads/123-dish.jpg'],
        key: 'uploads/123-dish.jpg',
        bodyHtml: '<img src="https://cdn.example.com/uploads/123-dish.jpg">',
        website: 'https://example.com',
      },
      urlMap,
      keyMap,
    );
    expect(rewritten.changed).toBe(true);
    const doc = rewritten.value as {
      _id: Types.ObjectId;
      photos: string[];
      key: string;
      bodyHtml: string;
      website: string;
    };
    expect(doc._id).toBe(id);
    expect(doc.photos[0]).toBe(`https://cdn.example.com/restaurants/${RESTAURANT}/menu/123-dish.jpg`);
    expect(doc.key).toBe(`restaurants/${RESTAURANT}/menu/123-dish.jpg`);
    expect(doc.bodyHtml).toContain(`restaurants/${RESTAURANT}/menu/123-dish.jpg`);
    expect(doc.website).toBe('https://example.com');
  });
});
