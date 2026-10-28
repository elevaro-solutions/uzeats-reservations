import { describe, expect, it } from 'vitest';
import { filterInventorySlugs } from '../discovery.js';

describe('filterInventorySlugs', () => {
  it('keeps only slugs with count > 0 when the index has stock', () => {
    expect(
      filterInventorySlugs(
        [
          { slug: 'philadelphia-pa', count: 4 },
          { slug: 'new-york-ny', count: 0 },
          { slug: 'key-west-fl', count: 2 },
        ],
        ['new-york-ny'],
      ),
    ).toEqual(['philadelphia-pa', 'key-west-fl']);
  });

  it('uses live slugs when none report a positive count', () => {
    expect(
      filterInventorySlugs([{ slug: 'italian', count: 0 }, { slug: 'uzbek' }], ['american']),
    ).toEqual(['italian', 'uzbek']);
  });

  it('falls back to curated slugs when the index is empty', () => {
    expect(filterInventorySlugs([], ['new-york-ny', 'miami-fl'])).toEqual([
      'new-york-ny',
      'miami-fl',
    ]);
  });
});
